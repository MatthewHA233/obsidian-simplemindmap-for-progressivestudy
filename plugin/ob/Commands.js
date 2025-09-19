import { Notice, MarkdownView } from 'obsidian'

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
      checkCallback: checking => {
        const markdownView = this.app.workspace.getActiveViewOfType(
          MarkdownView
        )
        if (markdownView) {
          if (!checking) {
            this.plugin._createSmmFile('', fileName => {
              try {
                const file = this.app.vault.getFileByPath(fileName)
                const currentFile = this.app.workspace.getActiveFile()
                const linkText = this.app.fileManager.generateMarkdownLink(
                  file,
                  currentFile?.path || ''
                )
                const activeEditor = this.app.workspace.activeEditor
                activeEditor.editor.replaceSelection('!' + linkText)
              } catch (error) {
                console.error(error)
                new Notice(this._t('tip.createMindMapFail'))
              }
            })
          }
          return true
        }
        return false
      }
    })
  }

  _commonCheckCallback(checking, run) {
    const view = this.plugin._getActiveSmmView()
    if (view) {
      if (!checking) {
        run(view)
      }
      return true
    }
    return false
  }

  _addActionsCommand() {
    this._addMindMapEditActionCommands()
    this._addMinMapNodeActionCommands()
    this._addCanvasActionCommands()
    this._addHelpActionCommands()
    this._addUiActionCommands()
  }

  _addMindMapEditActionCommands() {
    // 编辑操作-保存
    this.addCommand({
      id: 'save-smm-mindmap',
      name: this._t('commands.save'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.forceSave()
        })
      }
    })
    // 编辑操作-保存并更新图像
    this.addCommand({
      id: 'save-smm-mindmap-and-update-image',
      name: this._t('commands.saveAndUpdateImage'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.forceSaveAndUpdateImage()
        })
      }
    })
    // 编辑操作-回退
    this.addCommand({
      id: 'undo-smm-mindmap-node',
      name: this._t('commands.undo'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'BACK')
        })
      }
    })
    // 编辑操作-前进
    this.addCommand({
      id: 'redo-smm-mindmap-node',
      name: this._t('commands.redo'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'FORWARD')
        })
      }
    })
    // 编辑操作-搜索和替换
    this.addCommand({
      id: 'show-smm-mindmap-search',
      name: this._t('commands.searchReplace'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('show_search')
        })
      }
    })
  }

  _addMinMapNodeActionCommands() {
    // 节点操作-插入下级节点
    this.addCommand({
      id: 'insert-smm-mindmap-child-node',
      name: this._t('commands.insertChildNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'INSERT_CHILD_NODE')
        })
      }
    })
    // 节点操作-插入同级节点
    this.addCommand({
      id: 'insert-smm-mindmap-sibling-node',
      name: this._t('commands.insertSiblingNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'INSERT_NODE')
        })
      }
    })
    // 节点操作-插入父节点
    this.addCommand({
      id: 'insert-smm-mindmap-parent-node',
      name: this._t('commands.insertParentNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'INSERT_PARENT_NODE')
        })
      }
    })
    // 节点操作-上移节点
    this.addCommand({
      id: 'move-smm-mindmap-node-up',
      name: this._t('commands.moveUpNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'UP_NODE')
        })
      }
    })
    // 节点操作-下移节点
    this.addCommand({
      id: 'move-smm-mindmap-node-down',
      name: this._t('commands.moveDownNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'DOWN_NODE')
        })
      }
    })
    // 节点操作-插入概要
    this.addCommand({
      id: 'insert-smm-mindmap-summary',
      name: this._t('commands.insertSummary'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'ADD_GENERALIZATION')
        })
      }
    })
    // 节点操作-展开/收起节点
    this.addCommand({
      id: 'toggle-expand-smm-mindmap-node',
      name: this._t('commands.toggleExpandNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('toggleActiveExpand')
        })
      }
    })
    // 节点操作-删除节点
    this.addCommand({
      id: 'delete-smm-mindmap-node',
      name: this._t('commands.deleteNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'REMOVE_NODE')
        })
      }
    })
    // 节点操作-仅删除当前节点
    this.addCommand({
      id: 'delete-smm-mindmap-node-only',
      name: this._t('commands.deleteNodeOnly'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'REMOVE_CURRENT_NODE')
        })
      }
    })
    // 节点操作-复制节点
    this.addCommand({
      id: 'copy-smm-mindmap-node',
      name: this._t('commands.copyNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('copyNode')
        })
      }
    })
    // 节点操作-剪切节点
    this.addCommand({
      id: 'cut-smm-mindmap-node',
      name: this._t('commands.cutNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('cutNode')
        })
      }
    })
    // 节点操作-粘贴节点
    this.addCommand({
      id: 'paste-smm-mindmap-node',
      name: this._t('commands.pasteNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('pasteNode')
        })
      }
    })
    // 节点操作-全选
    this.addCommand({
      id: 'select-all-smm-mindmap-node',
      name: this._t('commands.selectAllNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'SELECT_ALL')
        })
      }
    })
    // 节点操作-一键整理布局
    this.addCommand({
      id: 'organize-smm-mindmap-layout',
      name: this._t('commands.organizeLayout'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('execCommand', 'RESET_LAYOUT')
        })
      }
    })
    // 同级节点对齐，todo
    // 节点操作-切换粗体
    this.addCommand({
      id: 'toggle-bold-smm-mindmap-node',
      name: this._t('commands.toggleBoldNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('toggleBold')
        })
      }
    })
    // 节点操作-切换斜体
    this.addCommand({
      id: 'toggle-italic-smm-mindmap-node',
      name: this._t('commands.toggleItalicNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('toggleItalic')
        })
      }
    })
    // 节点操作-切换下划线
    this.addCommand({
      id: 'toggle-underline-smm-mindmap-node',
      name: this._t('commands.toggleUnderlineNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('toggleUnderline')
        })
      }
    })
    // 节点操作-切换删除线
    this.addCommand({
      id: 'toggle-strikethrough-smm-mindmap-node',
      name: this._t('commands.toggleStrikethroughNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('toggleStrikethrough')
        })
      }
    })
    // 节点操作-增大字号
    this.addCommand({
      id: 'increase-font-size-smm-mindmap-node',
      name: this._t('commands.increaseFontSizeNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('increaseFontSize')
        })
      }
    })
    // 节点操作-减小字号
    this.addCommand({
      id: 'decrease-font-size-smm-mindmap-node',
      name: this._t('commands.decreaseFontSizeNode'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('decreaseFontSize')
        })
      }
    })
  }

  _addCanvasActionCommands() {
    // 画布操作-放大
    this.addCommand({
      id: 'zoom-in-smm-mindmap',
      name: this._t('commands.zoomInCanvas'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('canvasZoomIn')
        })
      }
    })
    // 画布操作-缩小
    this.addCommand({
      id: 'zoom-out-smm-mindmap',
      name: this._t('commands.zoomOutCanvas'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('canvasZoomOut')
        })
      }
    })
    // 画布操作-回到根节点
    this.addCommand({
      id: 'back-to-root-smm-mindmap',
      name: this._t('commands.backToRootCanvas'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('canvasBackToRoot')
        })
      }
    })
    // 画布操作-向左移动焦点
    this.addCommand({
      id: 'activate-left-smm-mindmap',
      name: this._t('commands.activateLeftCanvas'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('canvasActivateLeftNode')
        })
      }
    })
    // 画布操作-向上移动焦点
    this.addCommand({
      id: 'activate-top-smm-mindmap',
      name: this._t('commands.activateTopCanvas'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('canvasActivateTopNode')
        })
      }
    })
    // 画布操作-向右移动焦点
    this.addCommand({
      id: 'activate-right-smm-mindmap',
      name: this._t('commands.activateRightCanvas'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('canvasActivateRightNode')
        })
      }
    })
    // 画布操作-向下移动焦点
    this.addCommand({
      id: 'activate-bottom-smm-mindmap',
      name: this._t('commands.activateBottomCanvas'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('canvasActivateBottomNode')
        })
      }
    })
    // 画布操作-适应画布
    this.addCommand({
      id: 'zoom-fit-smm-mindmap-node',
      name: this._t('commands.zoomFitCanvas'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('canvasZoomFit')
        })
      }
    })
  }

  _addHelpActionCommands() {
    // 进入演示模式
    this.addCommand({
      id: 'enter-smm-mindmap-demonstrate',
      name: this._t('commands.enterDemonstrate'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('enter_demonstrate')
        })
      }
    })
  }

  _addUiActionCommands() {
    // 打开图片编辑弹窗
    this.addCommand({
      id: 'open-smm-mindmap-image-edit',
      name: this._t('commands.openImageEdit'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('showNodeImage')
        })
      }
    })
    // 打开超链接编辑弹窗
    this.addCommand({
      id: 'open-smm-mindmap-hyperlink-edit',
      name: this._t('commands.openHyperlinkEdit'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('showNodeLink')
        })
      }
    })
    // 打开备注编辑弹窗
    this.addCommand({
      id: 'open-smm-mindmap-remark-edit',
      name: this._t('commands.openRemarkEdit'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('showNodeNote')
        })
      }
    })
    // 打开标签编辑弹窗
    this.addCommand({
      id: 'open-smm-mindmap-tag-edit',
      name: this._t('commands.openTagEdit'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('showNodeTag')
        })
      }
    })
    // 打开导入弹窗
    this.addCommand({
      id: 'open-smm-mindmap-import',
      name: this._t('commands.openImport'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('showImport')
        })
      }
    })
    // 打开导出弹窗
    this.addCommand({
      id: 'open-smm-mindmap-export',
      name: this._t('commands.openExport'),
      checkCallback: checking => {
        return this._commonCheckCallback(checking, view => {
          view.mindMapAPP.$bus.$emit('showExport')
        })
      }
    })
  }
}
