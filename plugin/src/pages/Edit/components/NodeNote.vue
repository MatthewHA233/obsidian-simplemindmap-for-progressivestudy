<template>
  <el-dialog
    class="nodeNoteDialog smmElDialog"
    :title="$t('nodeNote.title')"
    :visible.sync="dialogVisible"
    :width="'90%'"
    :top="isMobile ? '20px' : '15vh'"
    :modal-append-to-body="false"
    :close-on-click-modal="false"
  >
    <div class="noteEditor" ref="noteEditor" @keyup.stop @keydown.stop></div>
    <span slot="footer" class="dialog-footer">
      <el-button @click="cancel" size="small" class="smmElButtonSmall">{{
        $t('dialog.cancel')
      }}</el-button>
      <el-button
        type="primary"
        @click="confirm"
        size="small"
        class="smmElButtonSmall"
        >{{ $t('dialog.confirm') }}</el-button
      >
    </span>
  </el-dialog>
</template>

<script>
import Editor from '@toast-ui/editor'
import '@toast-ui/editor/dist/i18n/zh-cn'
import '@toast-ui/editor/dist/i18n/zh-TW'
import { isMobile } from 'simple-mind-map/src/utils/index'
import { mapState } from 'vuex'
import { toastUiEditorLangMap } from '@/config/constant'

// 节点备注内容设置
export default {
  name: 'NodeNote',
  data() {
    return {
      dialogVisible: false,
      note: '',
      activeNodes: [],
      editor: null,
      isMobile: isMobile(),
      appointNode: null
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark
    })
  },
  watch: {
    dialogVisible(val, oldVal) {
      if (!val && oldVal) {
        this.$root.$bus.$emit('endTextEdit')
      }
    }
  },
  created() {
    this.$root.$bus.$on('node_active', this.handleNodeActive)
    this.$root.$bus.$on('showNodeNote', this.handleShowNodeNote)
  },
  beforeDestroy() {
    this.$root.$bus.$off('node_active', this.handleNodeActive)
    this.$root.$bus.$off('showNodeNote', this.handleShowNodeNote)
  },
  methods: {
    handleNodeActive(...args) {
      this.activeNodes = [...args[1]]
      this.updateNoteInfo()
    },

    updateNoteInfo() {
      if (this.activeNodes.length > 0) {
        let firstNode = this.activeNodes[0]
        this.note = firstNode.getData('note') || ''
      } else {
        this.note = ''
      }
    },

    handleShowNodeNote(node) {
      this.$root.$bus.$emit('startTextEdit')
      if (node) {
        this.appointNode = node
        this.note = node.getData('note') || ''
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.initEditor()
      })
    },

    initEditor() {
      if (!this.editor) {
        this.editor = new Editor({
          el: this.$refs.noteEditor,
          height: '500px',
          initialEditType: 'markdown',
          previewStyle: 'vertical',
          theme: this.isDark ? 'dark' : 'light',
          language:
            toastUiEditorLangMap[this.$i18n.locale] || toastUiEditorLangMap.en
        })
      }
      this.editor.setMarkdown(this.note)
    },

    cancel() {
      this.dialogVisible = false
      if (this.appointNode) {
        this.appointNode = null
        this.updateNoteInfo()
      }
    },

    confirm() {
      this.note = this.editor.getMarkdown()
      if (this.appointNode) {
        this.appointNode.setNote(this.note)
      } else {
        this.activeNodes.forEach(node => {
          node.setNote(this.note)
        })
      }

      this.cancel()
    }
  }
}
</script>

<style lang="less" scoped>
.nodeNoteDialog {
  /deep/ .el-dialog {
    max-width: 800px;
  }

  .tip {
    margin-top: 5px;
    color: #dcdfe6;
  }
}
</style>
