<script setup lang="ts">
import { ref } from 'vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import ChatPanel from './ChatPanel.vue'
import DesignerPanel from './DesignerPanel.vue'
import SettingsModal from './SettingsModal.vue'

const chatWidth = ref(400)
const dragging = ref(false)
const settingsOpen = ref(false)

// 自定义分栏拖拽(不引入额外依赖)
function startDrag(e: PointerEvent) {
  dragging.value = true
  const onMove = (ev: PointerEvent) => {
    chatWidth.value = Math.min(680, Math.max(320, ev.clientX))
  }
  const onUp = () => {
    dragging.value = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}
</script>

<template>
  <a-config-provider :locale="zhCN">
    <div class="app-shell">
      <aside class="chat-side" :style="{ width: chatWidth + 'px' }">
        <ChatPanel @open-settings="settingsOpen = true" />
      </aside>
      <div class="splitter" :class="{ active: dragging }" @pointerdown="startDrag" />
      <main class="designer-main">
        <DesignerPanel />
      </main>
    </div>
    <SettingsModal :open="settingsOpen" @close="settingsOpen = false" />
  </a-config-provider>
</template>
