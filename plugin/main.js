import {
  addIcon,
  Plugin,
  TFile,
  TFolder,
  Notice,
  MarkdownView,
  WorkspaceLeaf,
  Workspace,
  getLanguage
} from 'obsidian'
import './style.css'
import SmmEditView from './SmmEditView.js'
import {
  SMM_VIEW_TYPE,
  SIDE_BAR_ICON,
  SMM_TAG,
  DEFAULT_SETTINGS,
  IGNORE_CHECK_SMM
} from './ob/constant.js'
import dayjs from 'dayjs'
import {
  createDefaultText,
  createDefaultMindMapData
} from './ob/metadataAndMarkdown.js'
import { around, dedupe } from 'monkey-around'
import { hideTargetMenu } from './ob/utils.js'
import MarkdownPostProcessor from './ob/MarkdownPostProcessor.js'
import SmmSettingTab from './ob/SmmSettingTab.js'
import { langList } from './src/config/zh'
import i18n from 'i18next'
import enTranslations from './locales/en.json'
import zhTranslations from './locales/zh.json'
import viTranslations from './locales/vi.json'
import zhtwTranslations from './locales/zhtw.json'
import { PreviewMindMap } from './ob/PreviewMindMap.js'
import Commands from './ob/Commands.js'

export default class SimpleMindMapPlugin extends Plugin {
  async onload() {
    // 添加设置
    await this._addSetting()

    // 初始化多语言
    i18n.init({
      lng: getLanguage() || 'en', // 自动检测用户语言
      fallbackLng: 'en',
      resources: {
        en: { translation: enTranslations },
        zh: { translation: zhTranslations },
        vi: { translation: viTranslations },
        ['zh-TW']: { translation: zhtwTranslations }
      }
    })

    addIcon('smm-icon', SIDE_BAR_ICON)

    // 注册自定义视图
    this.registerView(SMM_VIEW_TYPE, leaf => new SmmEditView(leaf, this))

    // 添加 Ribbon 图标
    this._createSmmFile = this._createSmmFile.bind(this)
    this.addRibbonIcon(
      'smm-icon',
      this._t('action.createMindMap'), // 新建思维导图
      this._createSmmFile
    )
    this._setCustomFileIcon()

    // 添加命令
    this.commands = new Commands(this)

    // 添加右键菜单
    this._addFileMenus()

    // 打补丁，拦截默认的打开方法
    this._registerMonkeyPatches()

    // 切换到思维导图视图
    this._switchToSmmAfterLoad()

    // 创建状态栏子元素
    this._initStatusBar()

    // 处理嵌入的思维导图
    this.markdownPostProcessor = new MarkdownPostProcessor(this)
    this.markdownPostProcessor.register()

    // 记录打开文件的子路径，用于定位到指定节点
    this.fileToSubpathMap = {}
  }

  // 创建思维导图文件
  async _createSmmFile(folderPath = '', callback) {
    try {
      if (typeof folderPath !== 'string') {
        folderPath = ''
      }
      let { fileNamePrefix, fileNameDateFormat } = this.settings
      fileNamePrefix = fileNamePrefix || 'MindMap'
      folderPath = this._getCreateFolderPath(folderPath)
      await this._ensureDirectoryExists(folderPath)
      const { vault } = this.app
      const filePath = `${
        folderPath ? folderPath + '/' : ''
      }${fileNamePrefix} ${dayjs().format(fileNameDateFormat)}.smm.md`
      const fileContent = createDefaultText(
        filePath,
        this._getCreateDefaultMindMapOptions()
      )
      try {
        // 检查文件是否已存在
        const existingFile = vault.getAbstractFileByPath(filePath)
        if (existingFile) {
          // 文件已经存在
          new Notice(this._t('tip.fileExist'))
        } else {
          // 创建新文件
          await vault.create(filePath, fileContent)
          if (callback && typeof callback === 'function') {
            callback(filePath)
          } else {
            await this.app.workspace.openLinkText(filePath, '', true)
          }
        }
      } catch (error) {
        // 新建思维导图失败
        console.error(error)
        new Notice(this._t('tip.createMindMapFail'))
      }
    } catch (error) {
      console.error(error)
      // 新建思维导图失败
      new Notice(this._t('tip.createMindMapFail'))
    }
  }

  // 获取创建文件夹路径
  _getCreateFolderPath(folderPath) {
    if (folderPath) return folderPath
    const { filePathType, filePath } = this.settings
    switch (filePathType) {
      case 'root':
        return ''
      case 'custom':
        return filePath
      case 'currentFileFolder':
        return this._getActiveFileDirectory()
      default:
        return ''
    }
  }

  // 添加右键菜单
  _addFileMenus() {
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFolder) {
          // 新建思维导图
          menu.addItem(item => {
            item
              .setTitle(this._t('action.createMindMap'))
              .setIcon('smm-icon')
              .onClick(() => {
                this._createSmmFile(file.path)
              })
          })
        } else if (file instanceof TFile) {
          if (this._isSmmFile(file)) {
            hideTargetMenu(menu, '在新窗口中打开')
            hideTargetMenu(menu, '移动至新窗口')
            // 打开为Markdown文档
            menu.addItem(item =>
              item
                .setTitle(this._t('action.openAsMd'))
                .setIcon('document')
                .setSection('open')
                .onClick(async () => {
                  await this.app.workspace.openLinkText(file.path, '', true)
                  const leaf = this.app.workspace.getLeaf(false)
                  const mdViewType =
                    this.app.viewRegistry.getTypeByExtension('md')
                  await leaf.setViewState({
                    type: mdViewType,
                    state: {
                      ...leaf.getViewState().state,
                      isSwitchToMarkdownViewFromSmmView: true
                    },
                    active: true
                  })
                  this.app.workspace.revealLeaf(leaf)
                })
            )
          }
        }
      })
    )
  }

  // 添加设置
  async _addSetting() {
    await this._loadSettings()
    this.addSettingTab(new SmmSettingTab(this.app, this))
  }

  // 加载设置
  async _loadSettings() {
    const data = await this.loadData()
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data || {})
    const obLang = getLanguage()
    const target = langList.find(
      item => item.value === obLang || item.alias === obLang
    )
    this.settings.lang = target ? target.value : 'en'
  }

  // 保存设置
  async _saveSettings() {
    await this.saveData(this.settings)
  }

  // 打补丁，拦截默认的打开方法
  _registerMonkeyPatches() {
    // 防止其他插件或 Obsidian 核心代码通过 getActiveViewOfType 获取到 SmmEditView 时产生冲突（例如误判为 Markdown 视图）
    const key = 'https://github.com/wanglin2/mind-map'
    this.register(
      around(Workspace.prototype, {
        getActiveViewOfType(old) {
          return dedupe(key, old, function (...args) {
            const result = old && old.apply(this, args)
            if (args[1] === IGNORE_CHECK_SMM) {
              return result
            }
            const currentView = this.app?.workspace?.activeLeaf?.view
            if (!currentView || !(currentView instanceof SmmEditView))
              return result
          })
        }
      })
    )
    // 背景：Obsidian 的嵌套工作区（如拆分窗口或某些插件创建的容器）可能导致 WorkspaceLeaf 的根节点获取异常。原始 getRoot() 可能返回非最顶层的容器
    /*
      修复逻辑：1.先调用原始 getRoot() 获取当前层级的根节点 top
              2.检查 top.getRoot 方法是否与当前实例的 getRoot 相同：
                2.1：如果相同，说明 top 已是最顶层根节点，直接返回
                2.2：如果不同，说明 top 仍是某个子容器，需递归调用 top.getRoot() 继续向上查找
    */
    // 如果该插件已存在，则跳过补丁（因为 hover-editor 已实现相同功能），避免冲突
    if (!this.app.plugins?.plugins?.['obsidian-hover-editor']) {
      this.register(
        around(WorkspaceLeaf.prototype, {
          getRoot(old) {
            return function () {
              const top = old.call(this)
              return top.getRoot === this.getRoot ? top : top.getRoot()
            }
          }
        })
      )
    }
    // 通过修改 Obsidian 核心的 WorkspaceLeaf.setViewState 方法，强制将特定文件定向到自定义视图
    const self = this
    this.register(
      around(WorkspaceLeaf.prototype, {
        detach(next) {
          return function () {
            return next.apply(this)
          }
        },
        setViewState(next) {
          return function (state, ...rest) {
            // 手动将smm视图切换为md视图不用拦截、md的预览和源码视图也不拦截
            if (
              state.state?.isSwitchToMarkdownViewFromSmmView ||
              ['preview', 'source'].includes(state.state?.mode)
            ) {
              return next.apply(this, [state, ...rest])
            }
            if (
              self._loaded &&
              state.type === 'markdown' &&
              state.state?.file
            ) {
              if (self._isSmmFile(state.state.file)) {
                if (rest && rest[0] && rest[0].subpath) {
                  self.fileToSubpathMap[state.state.file] = rest[0].subpath
                }
                const newState = {
                  ...state,
                  type: SMM_VIEW_TYPE
                }
                return next.apply(this, [newState, ...rest])
              }
            }
            return next.apply(this, [state, ...rest])
          }
        }
      })
    )
    // 在md视图下的smm文件右上角菜单增加切换为思维导图菜单
    this.register(
      around(MarkdownView.prototype, {
        onPaneMenu(next) {
          return function (menu, source) {
            const res = next.apply(this, [menu, source])
            if (self._isSmmFile(this.file)) {
              if (source === 'more-options') {
                // 打开为思维导图文档
                menu.addItem(item =>
                  item
                    .setTitle(self._t('action.openAsMindMap'))
                    .setIcon('document')
                    .setSection('pane')
                    .onClick(() => {
                      self._setSmmView(this.leaf)
                    })
                )
              }
            } else {
              if (source === 'more-options') {
                // 预览为思维导图
                menu.addItem(item =>
                  item
                    .setTitle(self._t('action.previewAsMindMap'))
                    .setIcon('smm-icon')
                    .setSection('pane')
                    .onClick(() => {
                      let previewMindMap = new PreviewMindMap({
                        plugin: self,
                        file: this.file,
                        onClose: () => {
                          previewMindMap = null
                        }
                      })
                    })
                )
              }
            }
            return res
          }
        }
      })
    )
  }

  // 切换到思维导图视图
  _switchToSmmAfterLoad() {
    this.app.workspace.onLayoutReady(async () => {
      let leaf
      const markdownLeaf = this.app.workspace.getLeavesOfType('markdown')
      for (leaf of markdownLeaf) {
        if (
          leaf.view instanceof MarkdownView &&
          leaf.view.file &&
          this._isSmmFile(leaf.view.file)
        ) {
          this._setSmmView(leaf)
        }
      }
    })
  }

  // 设置思维导图视图状态
  async _setSmmView(leaf) {
    await leaf.setViewState({
      type: SMM_VIEW_TYPE,
      state: leaf.view.getState(),
      popstate: true
    })
  }

  // 判断文件是否为思维导图
  _isSmmFile(file) {
    if (!file) {
      return false
    }
    const isString = typeof file === 'string'
    // 统一获取文件路径
    const filePath = isString ? file : file.path
    if (filePath.endsWith('.smm.md')) {
      return true
    }
    let cache = null
    if (isString) {
      cache = this.app.metadataCache.getCache(file)
    } else {
      if (file.extension === SMM_VIEW_TYPE) {
        return true
      }
      cache = this.app.metadataCache.getFileCache(file)
    }
    if (cache?.frontmatter?.tags?.contains(SMM_TAG)) {
      return true
    }
    if (/\.smm.*\.md$/.test(filePath)) {
      return true
    }
    return false
  }

  // 设置思维导图文件图标
  _setCustomFileIcon() {
    if (typeof this.app.vault.setConfigFileIcon === 'function') {
      this.app.vault.setConfigFileIcon('smm.md', 'smm-icon')
    }
  }

  // 创建状态栏子元素
  _initStatusBar() {
    // 创建状态栏主元素
    this.statusBarItem = this.addStatusBarItem()
    this.statusBarItem.empty()
    this.statusBarItem.style.display = 'none' // 默认隐藏

    // 创建专门用于显示 smm 文件状态的子元素
    this.smmFileStatus = this.statusBarItem.createEl('div', {
      cls: 'smm-file-status'
    })

    // 监听文件打开和视图变化
    this.registerEvent(
      this.app.workspace.on('file-open', this._updateStatusBar.bind(this))
    )

    this.registerEvent(
      this.app.workspace.on(
        'active-leaf-change',
        this._updateStatusBar.bind(this)
      )
    )

    // 初始更新
    this._updateStatusBar()
  }

  // 更新状态栏显示
  _updateStatusBar() {
    const activeFile = this.app.workspace.getActiveFile()

    // 检查是否是 smm 文件
    const isSmmFile = activeFile && this._isSmmFile(activeFile)

    // 获取状态栏容器
    const statusBar = this.app.statusBar.containerEl

    // 更新状态栏可见性
    if (isSmmFile) {
      this.statusBarItem.style.display = 'block'
      // 添加隐藏默认状态栏的类
      statusBar.classList.add('smm-file-status-active')
    } else {
      this.statusBarItem.style.display = 'none'
      // 移除隐藏类
      statusBar.classList.remove('smm-file-status-active')
    }
  }

  // 确保目录存在
  async _ensureDirectoryExists(dirPath) {
    if (!dirPath) return
    const { vault } = this.app
    // 检查目录是否存在
    const dir = vault.getAbstractFileByPath(dirPath)
    if (!dir) {
      // 递归创建目录
      await vault.createFolder(dirPath)
    }
  }

  // 多语言
  _t(val) {
    return i18n.t(val)
  }

  // 获取生成默认思维导图数据的配置
  _getCreateDefaultMindMapOptions() {
    const { defaultTheme, defaultThemeDark, defaultLayout } = this.settings
    return {
      theme: this._getObIsDark() ? defaultThemeDark : defaultTheme,
      layout: defaultLayout,
      rootNodeDefaultText: this._t('common.rootNodeDefaultText'),
      secondNodeDefaultText: this._t('common.secondNodeDefaultText'),
      branchNodeDefaultText: this._t('common.branchNodeDefaultText')
    }
  }

  // 根据参数生成默认思维导图数据
  _createDefaultMindMapData() {
    return createDefaultMindMapData(
      this._getCreateDefaultMindMapOptions(),
      false
    )
  }

  // 获取激活文件的目录
  _getActiveFileDirectory() {
    // 获取当前激活文件
    const activeFile = this.app.workspace.getActiveFile()
    if (!activeFile) {
      return null
    }
    // 检查是否为文件（排除文件夹）
    if (activeFile instanceof TFolder) {
      return null
    }
    // 获取父目录路径
    const parent = activeFile.parent
    if (!parent) {
      return null
    }
    // 返回目录路径（Vault 相对路径）
    return parent.path.replace(/\/$/, '')
  }

  // 获取ob是否是暗黑模式
  _getObIsDark() {
    return document.body.classList.contains('theme-dark')
  }

  // 卸载时清理
  onunload() {
    this.app.workspace.detachLeavesOfType(SMM_VIEW_TYPE)
    this.markdownPostProcessor.destroy()
    // 清理状态栏
    this.statusBarItem?.remove()
    this.commands.clear()
  }
}
