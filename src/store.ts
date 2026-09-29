import { reactive } from 'vue'
import type { ChatMsg, PageSchema, Settings } from './agent/types'

const LS_KEY = 'ai-flow:settings'

function loadSettings(): Settings {
  const defaults: Settings = { apiKey: '', model: 'deepseek-v4-flash', temperature: 0.3 }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch {
    /* 忽略损坏的存储 */
  }
  return defaults
}

// 模块级 store(App 挂载一次,组件卸载不清理)
export const store = reactive({
  messages: [] as ChatMsg[],
  generating: false,
  settings: loadSettings(),
  /** 当前设计器中展示的是哪条消息的 schema */
  lastAppliedId: '',
})

export function saveSettings(): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store.settings))
  } catch {
    /* 忽略 */
  }
}

// 设计器桥:DesignerPanel 挂载时注册,聊天面板通过它加载/读取画布 schema
export const designerBridge = {
  apply: null as null | ((schema: PageSchema, msgId: string) => void),
  getData: null as null | (() => PageSchema | undefined),
}
