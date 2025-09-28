<template>
  <el-dialog
    class="nodeCardDialog smmElDialog"
    :class="{ isDark: isDark }"
    :title="$t('nodeCard.title')"
    :visible.sync="dialogVisible"
    :width="'60%'"
    :top="isMobile ? '20px' : '15vh'"
    :modal-append-to-body="false"
  >
    <div class="cardSearchBox">
      <el-input
        v-model="searchFileText"
        size="mini"
        :placeholder="$t('nodeCard.searchPlaceholder')"
        @keyup.native.stop
      >
        <i slot="prefix" class="el-input__icon el-icon-search"></i>
      </el-input>
    </div>

    <div class="cardFileListBox smmCustomScrollbar">
      <div class="cardFileItem" v-for="file in fileList" :key="file.path">
        <el-checkbox
          v-model="file.selected"
          @change="onFileSelect(file)"
          :disabled="!file.selected && selectedFiles.length >= maxCards"
        >
          <div class="fileInfo">
            <div class="fileName">{{ file.basename }}</div>
            <div class="fileFolder" v-if="file.folder !== '/'">
              {{ file.folder }}
            </div>
          </div>
        </el-checkbox>
      </div>
    </div>

    <div class="selectedCardsList" v-if="selectedFiles.length > 0">
      <div class="selectedTitle">{{ $t('nodeCard.selectedCards') }} ({{ selectedFiles.length }}/{{ maxCards }})</div>
      <div class="cardItem" v-for="(file, index) in selectedFiles" :key="file.path">
        <span class="cardName">{{ file.basename }}</span>
        <el-button @click="removeCard(index)" size="mini" type="text" icon="el-icon-close"></el-button>
      </div>
    </div>

    <span slot="footer" class="dialog-footer">
      <el-button @click="cancel" size="small" class="smmElButtonSmall">{{
        $t('dialog.cancel')
      }}</el-button>
      <el-button
        type="primary"
        @click="confirm"
        size="small"
        class="smmElButtonSmall"
        :disabled="selectedFiles.length === 0"
        >{{ $t('nodeCard.add') }}</el-button
      >
    </span>
  </el-dialog>
</template>

<script>
import { mapState } from 'vuex'

// 节点卡片笔记设置
export default {
  data() {
    return {
      dialogVisible: false,
      activeNodes: [],
      fileList: [],
      allFileList: null,
      searchFileText: '',
      searchTimer: null,
      selectedFiles: [],
      maxCards: 20
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      isMobile: state => state.isMobile
    })
  },
  watch: {
    searchFileText() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.getObFiles()
      }, 300)
    },
    dialogVisible(val, oldVal) {
      if (!val && oldVal) {
        this.$root.$bus.$emit('endTextEdit')
      }
      if (val && !oldVal) {
        this.handleNodeActive('', this.activeNodes)
        this.getObFiles()
      }
    }
  },
  created() {
    this.$root.$bus.$on('node_active', this.handleNodeActive)
    this.$root.$bus.$on('showNodeCard', this.handleShowNodeCard)
  },
  beforeDestroy() {
    this.$root.$bus.$off('node_active', this.handleNodeActive)
    this.$root.$bus.$off('showNodeCard', this.handleShowNodeCard)
  },
  methods: {
    handleNodeActive(...args) {
      this.activeNodes = [...args[1]]
      if (this.activeNodes.length > 0) {
        let firstNode = this.activeNodes[0]
        const cardData = firstNode.getData('cardNotes') || []
        this.selectedFiles = cardData.map(item => ({
          path: item.path,
          basename: item.basename,
          folder: item.folder,
          selected: true
        }))
      }
    },

    handleShowNodeCard() {
      if (this.activeNodes.length <= 0) {
        return
      }
      this.dialogVisible = true
    },

    getObFiles() {
      try {
        let list = []
        if (this.allFileList) {
          list = this.allFileList
        } else {
          list = this.$root.$obsidianAPI.getObAllFiles().map(item => {
            return {
              folder: item.parent.path,
              path: item.path,
              basename: item.basename,
              selected: false
            }
          })
          this.allFileList = list
        }

        const searchText = this.searchFileText.trim()
        if (searchText) {
          list = list.filter(item => item.basename.includes(searchText))
        }

        // 标记已选中的文件
        list.forEach(file => {
          file.selected = this.selectedFiles.some(selected => selected.path === file.path)
        })

        this.fileList = list.slice(0, 50)
      } catch (error) {
        console.log(error)
      }
    },

    onFileSelect(file) {
      if (file.selected) {
        // 添加到选中列表
        if (this.selectedFiles.length < this.maxCards) {
          this.selectedFiles.push({
            path: file.path,
            basename: file.basename,
            folder: file.folder
          })
        } else {
          file.selected = false
        }
      } else {
        // 从选中列表移除
        const index = this.selectedFiles.findIndex(item => item.path === file.path)
        if (index !== -1) {
          this.selectedFiles.splice(index, 1)
        }
      }
    },

    removeCard(index) {
      const removedFile = this.selectedFiles.splice(index, 1)[0]
      // 更新fileList中对应项目的选中状态
      const fileItem = this.fileList.find(item => item.path === removedFile.path)
      if (fileItem) {
        fileItem.selected = false
      }
    },

    cancel() {
      this.dialogVisible = false
      this.searchFileText = ''
      this.selectedFiles = []
    },

    confirm() {
      const cardData = this.selectedFiles.map(file => ({
        path: file.path,
        basename: file.basename,
        folder: file.folder,
        addedAt: new Date().toISOString().split('T')[0] // 添加日期
      }))

      this.activeNodes.forEach(node => {
        // 使用统计逻辑工具函数
        this.addCardToNode(node, cardData)
        // 重新渲染节点以显示卡片数量按钮
        node.reRender(['cardCount'])
      })

      this.cancel()
    },

    // 添加卡片到节点并更新统计
    addCardToNode(node, cardData) {
      const today = new Date().toISOString().split('T')[0]

      // 直接设置到节点数据对象（更底层的方式）
      if (!node.nodeData.data) {
        node.nodeData.data = {}
      }
      node.nodeData.data.cardNotes = cardData

      // 获取或初始化每日活动数据
      let dailyActivity = node.nodeData.data.dailyActivity || {}

      // 初始化今天的活动数据
      if (!dailyActivity[today]) {
        dailyActivity[today] = {
          cardLinksAdded: 0,
          masteryTriggered: false,
          isFirstMastery: false
        }
      }

      // 更新当天新增卡片数量
      dailyActivity[today].cardLinksAdded = cardData.length

      // 检查并触发掌握度逻辑
      this.checkAndTriggerMastery(node, today, dailyActivity)

      // 更新节点数据
      node.nodeData.data.dailyActivity = dailyActivity

      // 更新祖先节点的统计缓存
      this.updateAncestorStats(node, cardData.length)
    },

    // 检查并触发掌握度逻辑
    checkAndTriggerMastery(node, today, dailyActivity) {
      const todayActivity = dailyActivity[today]
      const cardCount = todayActivity.cardLinksAdded

      // 检查是否有历史掌握记录
      const hasHistoryMastery = Object.keys(dailyActivity).some(date =>
        date !== today && dailyActivity[date].masteryTriggered
      )

      // 掌握逻辑判断
      let shouldTriggerMastery = false

      if (!hasHistoryMastery) {
        // 首次学习：当天≥3张卡片 → 掌握
        shouldTriggerMastery = cardCount >= 3
        if (shouldTriggerMastery) {
          todayActivity.isFirstMastery = true
        }
      } else {
        // 复习：当天≥1张卡片 → 掌握
        shouldTriggerMastery = cardCount >= 1
      }

      todayActivity.masteryTriggered = shouldTriggerMastery
    },

    // 递归更新祖先节点的统计缓存
    updateAncestorStats(node, cardIncrement) {
      let currentNode = node.parent

      while (currentNode) {
        // 获取或初始化统计缓存
        if (!currentNode.nodeData.data) {
          currentNode.nodeData.data = {}
        }
        let cachedStats = currentNode.nodeData.data.cachedStats || {
          totalDescendantCards: 0,
          maxDescendantMastery: 0
        }

        // 更新子树卡片总数
        cachedStats.totalDescendantCards += cardIncrement

        // 计算并更新子树最高熟悉度
        const currentMastery = this.calculateNodeMastery(currentNode)
        cachedStats.maxDescendantMastery = Math.max(cachedStats.maxDescendantMastery, currentMastery)

        // 保存更新后的统计数据
        currentNode.nodeData.data.cachedStats = cachedStats

        // 继续向上更新
        currentNode = currentNode.parent
      }
    },

    // 计算节点的熟悉度
    calculateNodeMastery(node) {
      const dailyActivity = (node.nodeData.data && node.nodeData.data.dailyActivity) || {}
      const today = new Date()

      // 找到最后一次掌握的日期
      let lastMasteryDate = null
      let masteryCount = 0

      for (const date in dailyActivity) {
        if (dailyActivity[date].masteryTriggered) {
          masteryCount++
          const dateObj = new Date(date)
          if (!lastMasteryDate || dateObj > lastMasteryDate) {
            lastMasteryDate = dateObj
          }
        }
      }

      if (!lastMasteryDate) {
        return 0 // 从未掌握
      }

      // 计算距离最后掌握的天数
      const daysSinceLastMastery = Math.floor((today - lastMasteryDate) / (1000 * 60 * 60 * 24))

      // 使用遗忘曲线计算熟悉度
      const baseFamiliarity = Math.min(masteryCount * 0.2, 0.8) + 0.2
      const timeFactor = Math.exp(-daysSinceLastMastery / 7)

      return Math.max(0, Math.min(1, baseFamiliarity * timeFactor))
    }
  }
}
</script>

<style lang="less" scoped>
.cardSearchBox {
  margin-bottom: 15px;
}

.cardFileListBox {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
}

.cardFileItem {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  .fileInfo {
    margin-left: 8px;

    .fileName {
      font-weight: 500;
      color: #333;
    }

    .fileFolder {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }
  }
}

.selectedCardsList {
  margin-top: 15px;
  border-top: 1px solid #e0e0e0;
  padding-top: 15px;

  .selectedTitle {
    font-weight: 500;
    margin-bottom: 10px;
    color: #333;
  }

  .cardItem {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    background: #f8f9fa;
    border-radius: 4px;
    margin-bottom: 8px;

    .cardName {
      flex: 1;
      font-size: 14px;
    }
  }
}

// 暗色主题
.isDark {
  .cardFileListBox {
    border-color: #404040;
  }

  .cardFileItem {
    border-color: #404040;

    .fileInfo {
      .fileName {
        color: #e0e0e0;
      }

      .fileFolder {
        color: #a0a0a0;
      }
    }
  }

  .selectedCardsList {
    border-color: #404040;

    .selectedTitle {
      color: #e0e0e0;
    }

    .cardItem {
      background: #2a2a2a;
    }
  }
}
</style>