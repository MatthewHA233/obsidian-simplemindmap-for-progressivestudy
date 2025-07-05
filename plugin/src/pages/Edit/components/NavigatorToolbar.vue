<template>
  <div
    class="navigatorContainer smmCustomScrollbar"
    :class="{ isDark: isDark }"
  >
    <div
      class="item"
      :aria-label="$t('navigatorToolbar.backToRoot')"
      data-tooltip-position="top"
    >
      <div class="btn iconfont icondingwei" @click="backToRoot"></div>
    </div>
    <div
      class="item"
      :aria-label="$t('navigatorToolbar.searchReplace')"
      data-tooltip-position="top"
    >
      <div class="btn iconfont iconsousuo" @click="showSearch"></div>
    </div>
    <div class="item">
      <MouseAction :isDark="isDark" :mindMap="mindMap"></MouseAction>
    </div>
    <div
      class="item"
      :aria-label="
        openMiniMap
          ? $t('navigatorToolbar.closeMiniMap')
          : $t('navigatorToolbar.openMiniMap')
      "
      data-tooltip-position="top"
    >
      <div class="btn iconfont icondaohang1" @click="toggleMiniMap"></div>
    </div>
    <div class="item">
      <Scale :isDark="isDark" :mindMap="mindMap"></Scale>
    </div>
    <div
      class="item"
      :aria-label="
        isDark
          ? $t('navigatorToolbar.exitDarkMode')
          : $t('navigatorToolbar.darkMode')
      "
      data-tooltip-position="top"
      v-if="showDarkChangeBtn"
    >
      <div
        class="btn iconfont"
        :class="[isDark ? 'iconmoon_line' : 'icontaiyang']"
        @click="toggleDark"
      ></div>
    </div>
    <div class="item">
      <div
        class="btn iconfont iconyanshibofang"
        @click="enterDemoMode"
        :aria-label="$t('demonstrate.demonstrate')"
        data-tooltip-position="top"
      ></div>
    </div>
    <div class="item">
      <el-dropdown @command="handleCommand">
        <div class="btn el-icon-more"></div>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="shortcutKey">
            <span class="iconfont iconjianpan"></span>
            {{ $t('navigatorToolbar.shortcutKeys') }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
    <Count
      :mindMap="mindMap"
      v-if="!isZenMode"
      style="margin-left: 6px;"
    ></Count>
  </div>
</template>

<script>
import Scale from './Scale.vue'
import MouseAction from './MouseAction.vue'
import { langList } from '@/config'
import i18n from '@/i18n'
import { mapState, mapMutations } from 'vuex'
import pkg from 'simple-mind-map/package.json'
import Count from './Count.vue'

// 导航器工具栏
export default {
  components: {
    Scale,
    MouseAction,
    Count
  },
  props: {
    mindMap: {
      type: Object
    }
  },
  data() {
    return {
      version: pkg.version,
      langList,
      lang: '',
      openMiniMap: false,
      showDarkChangeBtn: false,
      enterDemoModeTimer: null
    }
  },
  computed: {
    ...mapState({
      isReadonly: state => state.isReadonly,
      isDark: state => state.localConfig.isDark,
      isZenMode: state => state.localConfig.isZenMode,
      localConfig: state => state.localConfig
    })
  },
  created() {
    const { lang, themeMode } = this.$root.$obsidianAPI.getSettings()
    this.lang = lang || 'en'
    this.showDarkChangeBtn = themeMode !== 'follow'
    this.$root.$bus.$on('toggleReadonly', this.onToggleReadonly)
  },
  beforeDestroy() {
    clearTimeout(this.enterDemoModeTimer)
    this.enterDemoModeTimer = null
    this.$root.$bus.$off('toggleReadonly', this.onToggleReadonly)
  },
  methods: {
    ...mapMutations(['setLocalConfig', 'setActiveSidebar']),

    onToggleReadonly(isReadonly) {
      this.mindMap.setMode(isReadonly ? 'readonly' : 'edit')
    },

    toggleMiniMap() {
      this.openMiniMap = !this.openMiniMap
      this.$root.$bus.$emit('toggle_mini_map', this.openMiniMap)
    },

    onLangChange(lang) {
      i18n.locale = lang
      this.$root.$obsidianAPI.updateSettings({
        lang
      })
      this.$root.$bus.$emit('lang_change')
    },

    showSearch() {
      this.$root.$bus.$emit('show_search')
    },

    toggleDark() {
      if (this.$root.$obsidianAPI.getSettings().themeMode === 'follow') {
        this.$root.$obsidianAPI.showTip(
          this.$t('navigatorToolbar.darkModeFailTip')
        )
        this.showDarkChangeBtn = false
        return
      }
      const newIsDark = !this.isDark
      this.setLocalConfig({
        isDark: newIsDark
      })
      this.$root.$obsidianAPI.updateSettings({
        themeMode: newIsDark ? 'dark' : 'light'
      })
    },

    handleCommand(command) {
      if (command === 'shortcutKey') {
        this.setActiveSidebar('shortcutKey')
        return
      }
    },

    backToRoot() {
      this.mindMap.renderer.setRootNodeCenter()
    },

    enterDemoMode() {
      this.enterDemoModeTimer = setTimeout(() => {
        this.mindMap.resize()
        this.mindMap.demonstrate.jump(0)
      }, 1000)
      this.$root.$bus.$emit('enter_demonstrate')
      this.mindMap.demonstrate.enter()
    }
  }
}
</script>

<style lang="less" scoped>
.navigatorContainer {
  padding: 0 6px;
  position: absolute;
  left: 0px;
  bottom: 0px;
  background: hsla(0, 0%, 100%, 0.8);
  border-radius: 5px;
  opacity: 0.8;
  height: 40px;
  font-size: 12px;
  display: flex;
  align-items: center;

  &.isDark {
    background: #262a2e;

    .item {
      a {
        color: hsla(0, 0%, 100%, 0.6);
      }

      .btn {
        color: hsla(0, 0%, 100%, 0.6);

        &:hover {
          background-color: hsla(0, 0%, 100%, 0.05);
        }
      }
    }
  }

  .item {
    margin-right: 2px;

    &:last-of-type {
      margin-right: 0;
    }

    a {
      color: #303133;
      text-decoration: none;
    }

    .btn {
      cursor: pointer;
      font-size: 18px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background-color: #ecf5ff;
      }
    }
  }
}
</style>
