import Style from './Style'
import Shape from './Shape'
import { G, Rect, Text, SVG } from '@svgdotjs/svg.js'
import nodeGeneralizationMethods from './nodeGeneralization'
import nodeExpandBtnMethods from './nodeExpandBtn'
import nodeCommandWrapsMethods from './nodeCommandWraps'
import nodeCreateContentsMethods from './nodeCreateContents'
import nodeExpandBtnPlaceholderRectMethods from './nodeExpandBtnPlaceholderRect'
import nodeModifyWidthMethods from './nodeModifyWidth'
import nodeCooperateMethods from './nodeCooperate'
import quickCreateChildBtnMethods from './quickCreateChildBtn'
import nodeLayoutMethods from './nodeLayout'
import { CONSTANTS } from '../../../constants/constant'
import { copyNodeTree, createUid, addXmlns } from '../../../utils/index'

//  节点类
class MindMapNode {
  //  构造函数
  constructor(opt = {}) {
    this.opt = opt
    // 节点数据
    this.nodeData = this.handleData(opt.data || {})
    // 保存本次更新时的节点数据快照
    this.nodeDataSnapshot = ''
    // uid
    this.uid = opt.uid
    // 控制实例
    this.mindMap = opt.mindMap
    // 渲染实例
    this.renderer = opt.renderer
    // 渲染器
    this.draw = this.mindMap.draw
    this.nodeDraw = this.mindMap.nodeDraw
    this.lineDraw = this.mindMap.lineDraw
    // 样式实例
    this.style = new Style(this)
    // 节点当前生效的全部样式
    this.effectiveStyles = {}
    // 形状实例
    this.shapeInstance = new Shape(this)
    this.shapePadding = {
      paddingX: 0,
      paddingY: 0
    }
    // 是否是根节点
    this.isRoot = opt.isRoot === undefined ? false : opt.isRoot
    // 是否是概要节点
    this.isGeneralization =
      opt.isGeneralization === undefined ? false : opt.isGeneralization
    this.generalizationBelongNode = null
    // 节点层级
    this.layerIndex = opt.layerIndex === undefined ? 0 : opt.layerIndex
    // 节点宽
    this.width = opt.width || 0
    // 节点高
    this.height = opt.height || 0
    // 自定义文本的宽度
    this.customTextWidth = opt.data.data.customTextWidth || undefined
    // left
    this._left = opt.left || 0
    // top
    this._top = opt.top || 0
    // 自定义位置
    this.customLeft = opt.data.data.customLeft || undefined
    this.customTop = opt.data.data.customTop || undefined
    // 是否正在拖拽中
    this.isDrag = false
    // 父节点
    this.parent = opt.parent || null
    // 子节点
    this.children = opt.children || []
    // 当前同时操作该节点的用户列表
    this.userList = []
    // 节点内容的容器
    this.group = null
    this.shapeNode = null // 节点形状节点
    this.hoverNode = null // 节点hover和激活的节点
    // 节点内容对象
    this._customNodeContent = null
    this._imgData = null
    this._iconData = null
    this._textData = null
    this._hyperlinkData = null
    this._tagData = null
    this._noteData = null
    this.noteEl = null
    this.noteContentIsShow = false
    this._attachmentData = null
    this._cardCountData = null
    this._prefixData = null
    this._postfixData = null
    this._expandBtn = null
    this._lastExpandBtnType = null
    this._showExpandBtn = false
    this._openExpandNode = null
    this._closeExpandNode = null
    this._fillExpandNode = null
    this._userListGroup = null
    this._lines = []
    this._generalizationList = []
    this._unVisibleRectRegionNode = null
    this._isMouseenter = false
    this._customContentAddToNodeAdd = null
    // 尺寸信息
    this._rectInfo = {
      textContentWidth: 0,
      textContentHeight: 0,
      textContentWidthWithoutTag: 0
    }
    // 概要节点的宽高
    this._generalizationNodeWidth = 0
    this._generalizationNodeHeight = 0
    // 展开收缩按钮尺寸
    this.expandBtnSize = this.mindMap.opt.expandBtnSize
    // 是否是多选节点
    this.isMultipleChoice = false
    // 是否需要重新layout
    this.needLayout = false
    // 当前是否是隐藏状态
    this.isHide = false
    const proto = Object.getPrototypeOf(this)
    if (!proto.bindEvent) {
      // 节点尺寸计算和布局相关方法
      Object.keys(nodeLayoutMethods).forEach(item => {
        proto[item] = nodeLayoutMethods[item]
      })
      // 概要相关方法
      Object.keys(nodeGeneralizationMethods).forEach(item => {
        proto[item] = nodeGeneralizationMethods[item]
      })
      // 展开收起按钮相关方法
      Object.keys(nodeExpandBtnMethods).forEach(item => {
        proto[item] = nodeExpandBtnMethods[item]
      })
      // 展开收起按钮占位元素相关方法
      Object.keys(nodeExpandBtnPlaceholderRectMethods).forEach(item => {
        proto[item] = nodeExpandBtnPlaceholderRectMethods[item]
      })
      // 命令的相关方法
      Object.keys(nodeCommandWrapsMethods).forEach(item => {
        proto[item] = nodeCommandWrapsMethods[item]
      })
      // 创建节点内容的相关方法
      Object.keys(nodeCreateContentsMethods).forEach(item => {
        proto[item] = nodeCreateContentsMethods[item]
      })
      // 协同相关
      if (this.mindMap.cooperate) {
        Object.keys(nodeCooperateMethods).forEach(item => {
          proto[item] = nodeCooperateMethods[item]
        })
      }
      // 拖拽调整节点宽度
      Object.keys(nodeModifyWidthMethods).forEach(item => {
        proto[item] = nodeModifyWidthMethods[item]
      })
      // 快捷创建子节点按钮
      if (this.mindMap.opt.isShowCreateChildBtnIcon) {
        Object.keys(quickCreateChildBtnMethods).forEach(item => {
          proto[item] = quickCreateChildBtnMethods[item]
        })
        this.initQuickCreateChildBtn()
      }
      proto.bindEvent = true
    }
    // 初始化
    this.getSize()
    // 初始需要计算一下概要节点的大小，否则计算布局时获取不到概要的大小
    this.updateGeneralization()
    this.initDragHandle()
  }

  // 支持自定义位置
  get left() {
    return this.customLeft || this._left
  }

  set left(val) {
    this._left = val
  }

  get top() {
    return this.customTop || this._top
  }

  set top(val) {
    this._top = val
  }

  //  复位部分布局时会重新设置的数据
  reset() {
    this.children = []
    this.parent = null
    this.isRoot = false
    this.layerIndex = 0
    this.left = 0
    this.top = 0
  }

  // 节点被删除时需要复位的数据
  resetWhenDelete() {
    this._isMouseenter = false
  }

  //  处理数据
  handleData(data) {
    data.data.expand = data.data.expand === false ? false : true
    data.data.isActive = data.data.isActive === true ? true : false
    data.children = data.children || []
    return data
  }

  //  创建节点的各个内容对象数据
  // recreateTypes：[] custom、image、icon、text、hyperlink、tag、note、attachment、numbers、prefix、postfix、checkbox
  createNodeData(recreateTypes) {
    // 自定义节点内容
    const {
      isUseCustomNodeContent,
      customCreateNodeContent,
      createNodePrefixContent,
      createNodePostfixContent,
      addCustomContentToNode
    } = this.mindMap.opt
    // 需要创建的内容类型
    const typeList = [
      'custom',
      'image',
      'icon',
      'text',
      'hyperlink',
      'tag',
      'cardCount',
      'note',
      'attachment',
      'prefix',
      'postfix',
      ...this.mindMap.nodeInnerPrefixList.map(item => {
        return item.name
      }),
      ...this.mindMap.nodeInnerPostfixList.map(item => {
        return item.name
      })
    ]
    const createTypes = {}
    if (Array.isArray(recreateTypes)) {
      // 重新创建指定的内容类型
      typeList.forEach(item => {
        if (recreateTypes.includes(item)) {
          createTypes[item] = true
        }
      })
    } else {
      // 创建所有类型
      typeList.forEach(item => {
        createTypes[item] = true
      })
    }
    if (
      isUseCustomNodeContent &&
      customCreateNodeContent &&
      createTypes.custom
    ) {
      this._customNodeContent = customCreateNodeContent(this)
    }
    // 如果没有返回内容，那么还是使用内置的节点内容
    if (this._customNodeContent) {
      addXmlns(this._customNodeContent)
      return
    }
    if (createTypes.image) this._imgData = this.createImgNode()
    if (createTypes.icon) this._iconData = this.createIconNode()
    if (createTypes.text) this._textData = this.createTextNode()
    if (createTypes.hyperlink) this._hyperlinkData = this.createHyperlinkNode()
    if (createTypes.tag) this._tagData = this.createTagNode()
    if (createTypes.cardCount) this._cardCountData = this.createCardCountNode()
    if (createTypes.note) this._noteData = this.createNoteNode()
    if (createTypes.attachment)
      this._attachmentData = this.createAttachmentNode()
    this.mindMap.nodeInnerPrefixList.forEach(item => {
      if (createTypes[item.name]) {
        this[`_${item.name}Data`] = item.createContent(this)
      }
    })
    if (createTypes.prefix) {
      this._prefixData = createNodePrefixContent
        ? createNodePrefixContent(this)
        : null
      if (this._prefixData && this._prefixData.el) {
        addXmlns(this._prefixData.el)
      }
    }
    if (createTypes.postfix) {
      this._postfixData = createNodePostfixContent
        ? createNodePostfixContent(this)
        : null
      if (this._postfixData && this._postfixData.el) {
        addXmlns(this._postfixData.el)
      }
    }
    this.mindMap.nodeInnerPostfixList.forEach(item => {
      if (createTypes[item.name]) {
        this[`_${item.name}Data`] = item.createContent(this)
      }
    })
    if (
      addCustomContentToNode &&
      typeof addCustomContentToNode.create === 'function'
    ) {
      this._customContentAddToNodeAdd = addCustomContentToNode.create(this)
      if (
        this._customContentAddToNodeAdd &&
        this._customContentAddToNodeAdd.el
      ) {
        addXmlns(this._customContentAddToNodeAdd.el)
      }
    }
  }

  //  计算节点的宽高
  getSize(recreateTypes, opt = {}) {
    const ignoreUpdateCustomTextWidth = opt.ignoreUpdateCustomTextWidth || false
    if (!ignoreUpdateCustomTextWidth) {
      this.customTextWidth = this.getData('customTextWidth') || undefined
    }
    this.customLeft = this.getData('customLeft') || undefined
    this.customTop = this.getData('customTop') || undefined
    // 这里不要更新概要，不然即使概要没修改，每次也会重新渲染
    // this.updateGeneralization()
    this.createNodeData(recreateTypes)
    const { width, height } = this.getNodeRect()
    // 判断节点尺寸是否有变化
    const changed = this.width !== width || this.height !== height
    this.width = width
    this.height = height
    return changed
  }

  // 给节点绑定事件
  bindGroupEvent() {
    // 单击事件，选中节点
    this.group.on('click', e => {
      this.mindMap.emit('node_click', this, e)
      if (this.isMultipleChoice) {
        e.stopPropagation()
        this.isMultipleChoice = false
        return
      }
      if (
        this.mindMap.opt.onlyOneEnableActiveNodeOnCooperate &&
        this.userList.length > 0
      ) {
        return
      }
      this.active(e)
    })
    this.group.on('mousedown', e => {
      const {
        readonly,
        enableCtrlKeyNodeSelection,
        useLeftKeySelectionRightKeyDrag,
        mousedownEventPreventDefault
      } = this.mindMap.opt
      if (mousedownEventPreventDefault) {
        e.preventDefault()
      }
      // 只读模式不需要阻止冒泡
      if (!readonly) {
        if (this.isRoot) {
          // 根节点，右键拖拽画布模式下不需要阻止冒泡
          if (e.which === 3 && !useLeftKeySelectionRightKeyDrag) {
            e.stopPropagation()
          }
        } else {
          // 非根节点，且按下的是非鼠标中键，需要阻止事件冒泡
          if (e.which !== 2) {
            e.stopPropagation()
          }
        }
      }
      // 多选和取消多选
      if (!readonly && (e.ctrlKey || e.metaKey) && enableCtrlKeyNodeSelection) {
        this.isMultipleChoice = true
        const isActive = this.getData('isActive')
        if (!isActive)
          this.mindMap.emit(
            'before_node_active',
            this,
            this.renderer.activeNodeList
          )
        this.mindMap.renderer[
          isActive ? 'removeNodeFromActiveList' : 'addNodeToActiveList'
        ](this, true)
        this.renderer.emitNodeActiveEvent(isActive ? null : this)
      }
      this.mindMap.emit('node_mousedown', this, e)
    })
    this.group.on('mouseup', e => {
      if (!this.isRoot && e.which !== 2 && !this.mindMap.opt.readonly) {
        e.stopPropagation()
      }
      this.mindMap.emit('node_mouseup', this, e)
    })
    this.group.on('mouseenter', e => {
      if (this.isDrag) return
      this._isMouseenter = true
      // 显示展开收起按钮
      this.showExpandBtn()
      if (this.isGeneralization) {
        this.handleGeneralizationMouseenter()
      }
      this.mindMap.emit('node_mouseenter', this, e)
    })
    this.group.on('mouseleave', e => {
      if (!this._isMouseenter) return
      this._isMouseenter = false
      this.hideExpandBtn()
      if (this.isGeneralization) {
        this.handleGeneralizationMouseleave()
      }
      this.mindMap.emit('node_mouseleave', this, e)
    })
    // 双击事件
    this.group.on('dblclick', e => {
      const { readonly, onlyOneEnableActiveNodeOnCooperate } = this.mindMap.opt
      if (readonly || e.ctrlKey || e.metaKey) {
        return
      }
      e.stopPropagation()
      if (onlyOneEnableActiveNodeOnCooperate && this.userList.length > 0) {
        return
      }
      this.mindMap.emit('node_dblclick', this, e)
    })
    // 右键菜单事件
    this.group.on('contextmenu', e => {
      const { readonly, useLeftKeySelectionRightKeyDrag } = this.mindMap.opt
      // Mac上按住ctrl键点击鼠标左键不知为何触发的是contextmenu事件
      if (readonly || e.ctrlKey) {
        return
      }
      e.stopPropagation()
      e.preventDefault()
      // 如果是多选节点结束，那么不要触发右键菜单事件
      if (
        this.mindMap.select &&
        !useLeftKeySelectionRightKeyDrag &&
        this.mindMap.select.hasSelectRange()
      ) {
        return
      }
      // 如果有且只有当前节点激活了，那么不需要重新激活
      if (
        !(this.getData('isActive') && this.renderer.activeNodeList.length === 1)
      ) {
        this.renderer.clearActiveNodeList()
        this.active(e)
      }
      this.mindMap.emit('node_contextmenu', e, this)
    })
  }

  //  激活节点
  active(e) {
    if (this.mindMap.opt.readonly) {
      return
    }
    e && e.stopPropagation()
    if (this.getData('isActive')) {
      return
    }
    this.mindMap.emit('before_node_active', this, this.renderer.activeNodeList)
    this.renderer.clearActiveNodeList()
    this.renderer.addNodeToActiveList(this, true)
    this.renderer.emitNodeActiveEvent(this)
  }

  // 取消激活该节点
  deactivate() {
    this.mindMap.renderer.removeNodeFromActiveList(this)
    this.mindMap.renderer.emitNodeActiveEvent()
  }

  //  更新节点
  update(forceRender) {
    if (!this.group) {
      return
    }
    this.updateNodeActiveClass()
    const {
      alwaysShowExpandBtn,
      notShowExpandBtn,
      isShowCreateChildBtnIcon,
      readonly
    } = this.mindMap.opt
    const childrenLength = this.getChildrenLength()
    // 不显示展开收起按钮则不需要处理
    if (!notShowExpandBtn) {
      if (alwaysShowExpandBtn) {
        // 需要移除展开收缩按钮
        if (this._expandBtn && childrenLength <= 0) {
          this.removeExpandBtn()
        } else {
          this.renderExpandBtn()
        }
      } else {
        const { isActive, expand } = this.getData()
        // 展开状态且非激活状态，且当前鼠标不在它上面，才隐藏
        if (childrenLength <= 0) {
          this.removeExpandBtn()
        } else if (expand && !isActive && !this._isMouseenter) {
          this.hideExpandBtn()
        } else {
          this.showExpandBtn()
        }
      }
    }
    // 更新快速创建子节点按钮
    if (isShowCreateChildBtnIcon) {
      if (childrenLength > 0) {
        this.removeQuickCreateChildBtn()
      } else {
        const { isActive } = this.getData()
        if (isActive) {
          this.showQuickCreateChildBtn()
        } else {
          this.hideQuickCreateChildBtn()
        }
      }
    }
    // 更新拖拽手柄的显示与否
    this.updateDragHandle()
    // 更新概要
    this.renderGeneralization(forceRender)
    // 更新协同头像
    if (this.updateUserListNode) this.updateUserListNode()
    // 更新节点位置
    const t = this.group.transform()
    // 保存一份当前节点数据快照
    this.nodeDataSnapshot = readonly ? '' : JSON.stringify(this.getData())
    // 节点位置变化才更新，因为即使值没有变化属性设置操作也是耗时的
    if (this.left !== t.translateX || this.top !== t.translateY) {
      this.group.translate(this.left - t.translateX, this.top - t.translateY)
    }

    // 恢复卡片笔记显示状态
    this.restoreCardNoteState()
  }

  // 获取节点相当于画布的位置
  getNodePosInClient(_left, _top) {
    const drawTransform = this.mindMap.draw.transform()
    const { scaleX, scaleY, translateX, translateY } = drawTransform
    const left = _left * scaleX + translateX
    const top = _top * scaleY + translateY
    return {
      left,
      top
    }
  }

  // 判断节点是否可见
  checkIsInClient(padding = 0) {
    const { left: nx, top: ny } = this.getNodePosInClient(this.left, this.top)
    return (
      nx + this.width > 0 - padding &&
      ny + this.height > 0 - padding &&
      nx < this.mindMap.width + padding &&
      ny < this.mindMap.height + padding
    )
  }

  // 重新渲染节点，即重新创建节点内容、计算节点大小、计算节点内容布局、更新展开收起按钮，概要及位置
  reRender(recreateTypes, opt) {
    const sizeChange = this.getSize(recreateTypes, opt)
    this.layout()
    this.update()
    return sizeChange
  }

  // 更新节点激活状态
  updateNodeActiveClass() {
    if (!this.group) return
    const isActive = this.getData('isActive')
    this.group[isActive ? 'addClass' : 'removeClass']('active')
  }

  // 根据是否激活更新节点
  updateNodeByActive(active) {
    if (this.group) {
      const { isShowCreateChildBtnIcon } = this.mindMap.opt
      // 切换激活状态，需要切换展开收起按钮的显隐
      if (active) {
        this.showExpandBtn()
        if (isShowCreateChildBtnIcon) {
          this.showQuickCreateChildBtn()
        }
      } else {
        this.hideExpandBtn()
        if (isShowCreateChildBtnIcon) {
          this.hideQuickCreateChildBtn()
        }
      }
      this.updateNodeActiveClass()
      this.updateDragHandle()
    }
  }

  // 递归渲染
  // forceRender：强制渲染，无论是否处于画布可视区域
  // async：异步渲染
  render(callback = () => {}, forceRender = false, async = false) {
    // 节点
    // 重新渲染连线
    this.renderLine()
    const { openPerformance, performanceConfig } = this.mindMap.opt
    // 强制渲染、或没有开启性能模式、或不在画布可视区域内不渲染节点内容
    // 根节点不进行懒加载，始终渲染，因为滚动条插件依赖根节点进行计算
    if (
      forceRender ||
      !openPerformance ||
      this.checkIsInClient(performanceConfig.padding) ||
      this.isRoot
    ) {
      if (!this.group) {
        // 创建组
        this.group = new G()
        this.group.addClass('smm-node')
        this.group.css({
          cursor: 'default'
        })
        this.bindGroupEvent()
        this.nodeDraw.add(this.group)
        this.layout()
        this.update(forceRender)
      } else {
        if (!this.nodeDraw.has(this.group)) {
          this.nodeDraw.add(this.group)
        }
        if (this.needLayout) {
          this.needLayout = false
          this.layout()
        }
        this.updateExpandBtnPlaceholderRect()
        this.update(forceRender)
      }
    } else if (openPerformance && performanceConfig.removeNodeWhenOutCanvas) {
      this.removeSelf()
    }
    // 子节点
    if (
      this.children &&
      this.children.length &&
      this.getData('expand') !== false
    ) {
      let index = 0
      this.children.forEach(item => {
        const renderChild = () => {
          item.render(
            () => {
              index++
              if (index >= this.children.length) {
                callback()
              }
            },
            forceRender,
            async
          )
        }
        if (async) {
          setTimeout(renderChild, 0)
        } else {
          renderChild()
        }
      })
    } else {
      callback()
    }
    // 手动插入的节点立即获得焦点并且开启编辑模式
    if (this.nodeData.inserting) {
      delete this.nodeData.inserting
      this.active()
      // setTimeout(() => {
      this.mindMap.emit('node_dblclick', this, null, true)
      // }, 0)
    }
  }

  // 删除自身，只是从画布删除，节点容器还在，后续还可以重新插回画布
  removeSelf() {
    if (!this.group) return
    this.group.remove()
    this.removeGeneralization()
  }

  //  递归删除，只是从画布删除，节点容器还在，后续还可以重新插回画布
  remove() {
    if (!this.group) return
    this.group.remove()
    this.removeGeneralization()
    this.removeLine()
    // 子节点
    if (this.children && this.children.length) {
      this.children.forEach(item => {
        item.remove()
      })
    }
  }

  // 销毁节点，不但会从画布删除，而且原节点直接置空，后续无法再插回画布
  destroy() {
    this.removeLine()
    if (this.parent) {
      this.parent.removeLine()
    }
    if (!this.group) return
    if (this.emptyUser) {
      this.emptyUser()
    }
    this.resetWhenDelete()
    this.group.remove()
    this.removeGeneralization()
    this.group = null
    this.style.onRemove()
  }

  //  隐藏节点
  hide() {
    if (this.group) this.group.hide()
    this.hideGeneralization()
    if (this.parent) {
      const index = this.parent.children.indexOf(this)
      this.parent._lines[index] && this.parent._lines[index].hide()
      this._lines.forEach(item => {
        item.hide()
      })
    }
    // 子节点
    if (this.children && this.children.length) {
      this.children.forEach(item => {
        item.hide()
      })
    }
  }

  //  显示节点
  show() {
    if (!this.group) {
      return
    }
    this.group.show()
    this.showGeneralization()
    if (this.parent) {
      const index = this.parent.children.indexOf(this)
      this.parent._lines[index] && this.parent._lines[index].show()
      this._lines.forEach(item => {
        item.show()
      })
    }
    // 子节点
    if (this.children && this.children.length) {
      this.children.forEach(item => {
        item.show()
      })
    }
  }

  // 设置节点透明度
  // 包括连接线和下级节点
  setOpacity(val) {
    // 自身及连线
    if (this.group) this.group.opacity(val)
    this._lines.forEach(line => {
      line.opacity(val)
    })
    // 子节点
    this.children.forEach(item => {
      item.setOpacity(val)
    })
    // 概要节点
    this.setGeneralizationOpacity(val)
  }

  // 隐藏子节点
  hideChildren() {
    this._lines.forEach(item => {
      item.hide()
    })
    if (this.children && this.children.length) {
      this.children.forEach(item => {
        item.hide()
      })
    }
  }

  // 显示子节点
  showChildren() {
    this._lines.forEach(item => {
      item.show()
    })
    if (this.children && this.children.length) {
      this.children.forEach(item => {
        item.show()
      })
    }
  }

  // 被拖拽中
  startDrag() {
    this.isDrag = true
    if (this.group) this.group.addClass('smm-node-dragging')
  }

  // 拖拽结束
  endDrag() {
    this.isDrag = false
    if (this.group) this.group.removeClass('smm-node-dragging')
  }

  //  连线
  renderLine(deep = false) {
    if (this.getData('expand') === false) {
      return
    }
    let childrenLen = this.getChildrenLength()
    // 切换为鱼骨结构时，清空根节点和二级节点的连线
    if (this.mindMap.renderer.layout.nodeIsRemoveAllLines) {
      if (this.mindMap.renderer.layout.nodeIsRemoveAllLines(this)) {
        childrenLen = 0
      }
    }
    if (childrenLen > this._lines.length) {
      // 创建缺少的线
      new Array(childrenLen - this._lines.length).fill(0).forEach(() => {
        this._lines.push(this.lineDraw.path())
      })
    } else if (childrenLen < this._lines.length) {
      // 删除多余的线
      this._lines.slice(childrenLen).forEach(line => {
        line.remove()
      })
      this._lines = this._lines.slice(0, childrenLen)
    }
    // 画线
    this.renderer.layout.renderLine(
      this,
      this._lines,
      (...args) => {
        // 添加样式
        this.styleLine(...args)
      },
      this.style.getStyle('lineStyle', true)
    )
    // 子级的连线也需要更新
    if (deep && this.children && this.children.length > 0) {
      this.children.forEach(item => {
        item.renderLine(deep)
      })
    }
  }

  //  获取节点形状
  getShape() {
    // 节点使用功能横线风格的话不支持设置形状，直接使用默认的矩形
    return this.mindMap.themeConfig.nodeUseLineStyle
      ? CONSTANTS.SHAPE.RECTANGLE
      : this.style.getStyle('shape', false, false)
  }

  //  检查节点是否存在自定义数据
  hasCustomPosition() {
    return this.customLeft !== undefined && this.customTop !== undefined
  }

  //  检查节点是否存在自定义位置的祖先节点，包含自身
  ancestorHasCustomPosition() {
    let node = this
    while (node) {
      if (node.hasCustomPosition()) {
        return true
      }
      node = node.parent
    }
    return false
  }

  //  检查是否存在有概要的祖先节点
  ancestorHasGeneralization() {
    let node = this.parent
    while (node) {
      if (node.checkHasGeneralization()) {
        return true
      }
      node = node.parent
    }
    return false
  }

  //  添加子节点
  addChildren(node) {
    this.children.push(node)
  }

  //  设置连线样式
  styleLine(line, childNode, enableMarker) {
    const { enableInheritAncestorLineStyle } = this.mindMap.opt
    const getName = enableInheritAncestorLineStyle
      ? 'getSelfInhertStyle'
      : 'getSelfStyle'
    const width =
      childNode[getName]('lineWidth') || childNode.getStyle('lineWidth', true)
    const color =
      childNode[getName]('lineColor') ||
      this.getRainbowLineColor(childNode) ||
      childNode.getStyle('lineColor', true)
    const dasharray =
      childNode[getName]('lineDasharray') ||
      childNode.getStyle('lineDasharray', true) ||
''
    this.style.line(
      line,
      {
        width,
        color,
        dasharray
      },
      enableMarker,
      childNode
    )
  }

  // 获取彩虹线条颜色
  getRainbowLineColor(node) {
    return this.mindMap.rainbowLines
      ? this.mindMap.rainbowLines.getNodeColor(node)
      : ''
  }

  //  移除连线
  removeLine() {
    this._lines.forEach(line => {
      line.remove()
    })
    this._lines = []
  }

  //  检测当前节点是否是某个节点的祖先节点
  isAncestor(node) {
    if (this.uid === node.uid) {
      return false
    }
    let parent = node.parent
    while (parent) {
      if (this.uid === parent.uid) {
        return true
      }
      parent = parent.parent
    }
    return false
  }

  // 检查当前节点是否是某个节点的父节点
  isParent(node) {
    if (this.uid === node.uid) {
      return false
    }
    const parent = node.parent
    if (parent && this.uid === parent.uid) {
      return true
    }
    return false
  }

  //  检测当前节点是否是某个节点的兄弟节点
  isBrother(node) {
    if (!this.parent || this.uid === node.uid) {
      return false
    }
    return this.parent.children.find(item => {
      return item.uid === node.uid
    })
  }

  // 获取该节点在兄弟节点列表中的索引
  getIndexInBrothers() {
    return this.parent && this.parent.children
      ? this.parent.children.findIndex(item => {
          return item.uid === this.uid
        })
      : -1
  }

  //  获取padding值
  getPaddingVale() {
    return {
      paddingX: this.getStyle('paddingX'),
      paddingY: this.getStyle('paddingY')
    }
  }

  //  获取某个样式
  getStyle(prop, root) {
    const v = this.style.merge(prop, root)
    return v === undefined ? '' : v
  }

  //  获取自定义样式
  getSelfStyle(prop) {
    return this.style.getSelfStyle(prop)
  }

  //   获取最近一个存在自身自定义样式的祖先节点的自定义样式
  getParentSelfStyle(prop) {
    if (this.parent) {
      return (
        this.parent.getSelfStyle(prop) || this.parent.getParentSelfStyle(prop)
      )
    }
    return null
  }

  //  获取自身可继承的自定义样式
  getSelfInhertStyle(prop) {
    return (
      this.getSelfStyle(prop) || // 自身
      this.getParentSelfStyle(prop)
    ) // 父级
  }

  // 获取节点非节点状态的边框大小
  getBorderWidth() {
    return this.style.merge('borderWidth', false) || 0
  }

  //  获取数据
  getData(key) {
    return key ? this.nodeData.data[key] : this.nodeData.data
  }

  // 获取该节点的纯数据，即不包含对节点实例的引用
  getPureData(removeActiveState = true, removeId = false) {
    return copyNodeTree({}, this, removeActiveState, removeId)
  }

  // 获取祖先节点列表
  getAncestorNodes() {
    const list = []
    let parent = this.parent
    while (parent) {
      list.unshift(parent)
      parent = parent.parent
    }
    return list
  }

  // 是否存在自定义样式
  hasCustomStyle() {
    return this.style.hasCustomStyle()
  }

  // 获取节点的尺寸和位置信息，宽高是应用了缩放效果后的实际宽高，位置是相对于浏览器窗口左上角的位置
  getRect() {
    return this.group ? this.group.rbox() : null
  }

  // 获取节点的尺寸和位置信息，宽高是应用了缩放效果后的实际宽高，位置信息相对于画布
  getRectInSvg() {
    const { scaleX, scaleY, translateX, translateY } =
      this.mindMap.draw.transform()
    let { left, top, width, height } = this
    const right = (left + width) * scaleX + translateX
    const bottom = (top + height) * scaleY + translateY
    left = left * scaleX + translateX
    top = top * scaleY + translateY
    return {
      left,
      right,
      top,
      bottom,
      width: width * scaleX,
      height: height * scaleY
    }
  }

  // 高亮节点
  highlight() {
    if (this.group) this.group.addClass('smm-node-highlight')
  }

  // 取消高亮节点
  closeHighlight() {
    if (this.group) this.group.removeClass('smm-node-highlight')
  }

  // 伪克隆节点
  // 克隆出的节点并不能真正当做一个节点使用
  fakeClone() {
    const newNode = new MindMapNode({
      ...this.opt,
      uid: createUid()
    })
    Object.keys(this).forEach(item => {
      newNode[item] = this[item]
    })
    return newNode
  }

  // 创建SVG文本节点
  createSvgTextNode(text = '') {
    return new Text().text(text)
  }

  // 获取SVG.js库的一些对象
  getSvgObjects() {
    return {
      SVG,
      G,
      Rect
    }
  }

  // 检查是否支持拖拽调整宽度
  // 1.富文本模式
  // 2.自定义节点内容
  checkEnableDragModifyNodeWidth() {
    const {
      enableDragModifyNodeWidth,
      isUseCustomNodeContent,
      customCreateNodeContent
    } = this.mindMap.opt
    return (
      enableDragModifyNodeWidth &&
      (this.mindMap.richText ||
        (isUseCustomNodeContent && customCreateNodeContent))
    )
  }

  // 是否存在自定义宽度
  hasCustomWidth() {
    return (
      this.checkEnableDragModifyNodeWidth() &&
      this.customTextWidth !== undefined
    )
  }

  // 获取子节点的数量
  getChildrenLength() {
    return this.nodeData.children ? this.nodeData.children.length : 0
  }

  // 卡片笔记子节点管理
  toggleCardNoteNodes() {
    const cardData = (this.nodeData.data && this.nodeData.data.cardNotes) || []

    if (this._cardNoteNodesVisible) {
      // 隐藏卡片笔记节点
      this.hideCardNoteNodes()
    } else {
      // 显示卡片笔记节点
      this.showCardNoteNodes(cardData)
    }
  }

  showCardNoteNodes(cardData) {
    this._cardNoteNodesVisible = true
    this._cardNoteElements = []

    // 创建独立的卡片笔记元素（不使用常规节点系统）
    cardData.forEach((card, index) => {
      const cardElement = this.createCardNoteElement(card, index)
      this._cardNoteElements.push(cardElement)
      this.group.add(cardElement.group)
    })

    // 立即布局，使用 requestAnimationFrame 确保渲染完成
    requestAnimationFrame(() => {
      this.layoutCardNoteElements()
    })
  }

  createCardNoteElement(card, index) {
    // 卡片笔记样式配置 - 紫色半透明设计
    const style = {
      padding: 2,
      fontSize: 10,
      fontWeight: 'normal',
      backgroundColor: 'rgba(138, 43, 226, 0.7)',
      textColor: '#ffffff',
      borderColor: 'rgba(138, 43, 226, 0.9)',
      borderRadius: 3,
      minWidth: 25
    }

    // 创建文本
    const text = new Text().text(`[[${card.basename}]]`)

    // 设置文本样式
    text.attr({
      'font-size': style.fontSize + 'px',
      'font-family': this.style.fontFamily,
      'font-weight': style.fontWeight,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle'
    })

    text.css({
      'font-size': style.fontSize + 'px !important',
      'line-height': '1'
    })

    // 设置文本颜色
    if (style.textColor) {
      text.fill(style.textColor)
    }

    // 获取文本尺寸
    const { width: textWidth, height: textHeight } = text.bbox()

    // 计算容器尺寸
    const rectWidth = Math.max(style.minWidth, textWidth + style.padding * 2)
    const rectHeight = textHeight + style.padding

    // 创建背景矩形
    const rect = new Rect()
      .size(rectWidth, rectHeight)
      .fill(style.backgroundColor)
      .stroke({ color: style.borderColor, width: 1 })
      .radius(style.borderRadius)

    // 文本居中
    text.center(rectWidth / 2, rectHeight / 2)

    // 创建组容器
    const group = new G()
    group.add(rect)
    group.add(text)

    // 添加双击事件打开文件
    group.css('cursor', 'pointer')
    group.on('dblclick', (e) => {
      e.stopPropagation()
      e.preventDefault()
      this.mindMap.emit('open_obsidian_file', card.path)
    })

    // Ctrl+悬浮预览功能 - 经过测试验证的有效实现
    let isMouseOver = false
    let previewTriggered = false

    const checkAndTriggerPreview = () => {
      if (isMouseOver && !previewTriggered) {
        previewTriggered = true
        this.mindMap.emit('show_obsidian_preview', {
          path: card.path,
          linkText: card.basename,
          sourceElement: group.node
        })
      }
    }

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        checkAndTriggerPreview()
      }
    }

    group.on('mouseenter', () => {
      isMouseOver = true
      previewTriggered = false
      document.addEventListener('keydown', handleKeyDown)
    })

    group.on('mouseleave', () => {
      isMouseOver = false
      previewTriggered = false
      document.removeEventListener('keydown', handleKeyDown)
    })

    // 创建连接线到父节点
    const line = this.createCardNoteLine()

    return {
      group,
      line,
      card,
      width: rectWidth,
      height: rectHeight,
      index
    }
  }

  createCardNoteLine() {
    // 使用path创建更好的连接线
    const line = this.draw.path()

    // 创建蓝到紫的渐变
    const gradient = this.draw.gradient('linear', (add) => {
      add.stop(0, '#409eff')
      add.stop(1, '#8b2bce')
    })

    // 设置连接线样式
    line.fill('none').stroke({
      color: gradient,
      width: 1.5,
      dasharray: '4,4',
      linecap: 'round',
      linejoin: 'round'
    })

    this.group.add(line)
    return line
  }

  layoutCardNoteElements() {
    if (!this._cardNoteElements || this._cardNoteElements.length === 0) {
      return
    }

    // 获取卡片数量按钮的位置
    const cardCountButton = this._cardCountData
    let connectionStartX = 0
    let connectionStartY = 0

    try {
      if (cardCountButton && cardCountButton.node) {
        // 获取卡片数量按钮的实际位置
        const buttonRect = cardCountButton.node.bbox()
        const parentRect = this.group.bbox()

        // 从按钮右边缘开始，增加更多偏移避免遮挡按钮
        connectionStartX = buttonRect.x + buttonRect.width - parentRect.x + 8
        connectionStartY = buttonRect.y + buttonRect.height / 2 - parentRect.y

      } else {
        // 后备方案：从节点右边缘开始
        const parentRect = this.group.bbox()
        connectionStartX = parentRect.width
        connectionStartY = 0

      }
    } catch (error) {
      // 使用更安全的后备方案
      connectionStartX = 100  // 固定偏移
      connectionStartY = 0
    }

    const startX = connectionStartX + 10
    const cardSpacing = 22
    let currentY = connectionStartY - (this._cardNoteElements.length - 1) * cardSpacing / 2

    this._cardNoteElements.forEach((cardElement, index) => {
      const { group, line, width, height } = cardElement

      if (!group || !line) {
        return
      }

      try {
        // 设置卡片位置
        group.move(startX, currentY - height / 2)

        // 设置连接线
        const midX = connectionStartX + (startX - connectionStartX) / 2
        const pathData = `M ${connectionStartX} ${connectionStartY} Q ${midX} ${connectionStartY} ${startX} ${currentY}`
        line.plot(pathData)

        currentY += cardSpacing
      } catch (error) {
        // 忽略布局错误
      }
    })

  }

  hideCardNoteNodes() {
    if (!this._cardNoteNodesVisible) {
      return
    }

    // 移除所有卡片笔记元素
    if (this._cardNoteElements) {
      this._cardNoteElements.forEach(cardElement => {
        if (cardElement.group) {
          cardElement.group.remove()
        }
        if (cardElement.line) {
          cardElement.line.remove()
        }
      })
      this._cardNoteElements = []
    }

    this._cardNoteNodesVisible = false
  }

  // 恢复卡片笔记显示状态（在节点更新后调用）
  restoreCardNoteState() {
    // 如果之前卡片笔记是显示的，重新显示它们
    if (this._cardNoteNodesVisible) {
      const cardData = (this.nodeData.data && this.nodeData.data.cardNotes) || []
      if (cardData.length > 0) {
        // 清除现有的卡片笔记元素，重新创建
        if (this._cardNoteElements) {
          this._cardNoteElements.forEach(cardElement => {
            if (cardElement.group) {
              cardElement.group.remove()
            }
            if (cardElement.line) {
              cardElement.line.remove()
            }
          })
        }

        // 重新创建和显示卡片笔记
        this._cardNoteElements = []
        cardData.forEach((card, index) => {
          const cardElement = this.createCardNoteElement(card, index)
          this._cardNoteElements.push(cardElement)
          this.group.add(cardElement.group)
        })

        // 立即重新布局
        requestAnimationFrame(() => {
          this.layoutCardNoteElements()
        })
      }
    }
  }
}

export default MindMapNode
