import { Notice } from 'obsidian'

export default class Commands {
  constructor(plugin) {
    this.plugin = plugin
    this.app = plugin.app

    this._addCreatesCommand()
    this._addActionsCommand()
  }

  clear() {}

  addCommand(command) {
    this.plugin.addCommand(command)
  }

  _t(key) {
    return this.plugin._t(key)
  }

  _addCreatesCommand() {
    // 新建思维导图
    this.addCommand({
      id: 'create-smm-mindmap',
      name: this._t('action.createMindMap'),
      callback: async () => {
        this.plugin._createSmmFile()
      }
    })
    // 新建思维导图并插入当前文档
    this.addCommand({
      id: 'create-smm-mindmap-insert-markdown',
      name: this._t('action.createMindMapInsertToMd'),
      editorCallback: editor => {
        this.plugin._createSmmFile('', fileName => {
          try {
            const file = this.app.vault.getAbstractFileByPath(fileName)
            const currentFile = this.app.workspace.getActiveFile()
            if (currentFile?.extension !== 'md') {
              // 当前文件不是markdown文件
              new Notice(this._t('tip.fileIsNotMd'))
              return
            }
            const linkText = this.app.fileManager.generateMarkdownLink(
              file,
              currentFile?.path || ''
            )
            editor.replaceSelection('!' + linkText)
          } catch (error) {
            console.error(error)
            // 新建思维导图失败
            new Notice(this._t('tip.createMindMapFail'))
          }
        })
      }
    })
  }

  _addActionsCommand() {
    // 演示模式
    this.addCommand({
      id: 'enter-smm-mindmap-demonstrate',
      name: this._t('action.enterDemonstrate'),
      checkCallback: checking => {
        const view = this.plugin._getActiveSmmView()
        if (view) {
          if (!checking) {
            view.mindMapAPP.$bus.$emit('enter_demonstrate')
          }
          return true
        }
        return false
      }
    })
    // 保存并更新图像
    this.addCommand({
      id: 'save-smm-mindmap-and-update-image',
      name: this._t('action.saveAndUpdateImage'),
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 's'
        }
      ],
      checkCallback: checking => {
        const view = this.plugin._getActiveSmmView()
        if (view) {
          if (!checking) {
            view.forceSaveAndUpdateImage()
          }
          return true
        }
        return false
      }
    })
  }
}
