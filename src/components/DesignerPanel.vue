<script setup lang="ts">
import { ref } from 'vue'
import { EDesigner } from 'epic-designer'
import { message, Modal } from 'ant-design-vue'
import { starterSchema } from '../agent/starter-schema'
import { designerBridge, store } from '../store'
import type { PageSchema } from '../agent/types'

// 单表单模式:工具栏只显示表单类组件,符合"生成表单"的产品定位
const USE_FORM_MODE = true

const designerRef = ref<any>(null)
const ready = ref(false)
let pending: { schema: PageSchema; msgId: string } | null = null

// 统一入口:聊天生成与历史卡回放都走这里。
// ready 前(挂载早期)先暂存,ready 事件(内部 Suspense 完成)后 flush。
function applySchema(schema: PageSchema, msgId: string) {
  if (!ready.value) {
    pending = { schema, msgId }
    return
  }
  try {
    designerRef.value?.setData(structuredClone(schema))
    store.lastAppliedId = msgId
  } catch (err) {
    console.error('[applySchema] 加载到设计器失败:', err)
    message.error(`加载到设计器失败:${err instanceof Error ? err.message : String(err)}`)
  }
}

function onReady() {
  ready.value = true
  if (pending) {
    applySchema(pending.schema, pending.msgId)
    pending = null
  } else {
    // 首屏统一展示初始空表单(库在挂载期渲染的是内置默认页节点)
    applySchema(starterSchema, '')
  }
}

function onSave(payload: PageSchema) {
  // 设计器内置保存按钮:提示即可(导出用下方自定义按钮)
  void payload
  message.success('已保存')
}

function getData(): PageSchema | undefined {
  if (!ready.value) return undefined
  return designerRef.value?.getData()
}

// 注册到桥(DesignerPanel 在 App 顶层只挂载一次)
designerBridge.apply = applySchema
designerBridge.getData = getData

// DEV 调试钩子:便于无头浏览器/控制台验证设计器链路
if (import.meta.env.DEV) {
  const sampleSchema: PageSchema = {
    canvas: { mode: 'desktop' },
    schemas: [
      {
        type: 'form', id: 'dbg-root', label: '调试表单',
        props: { name: 'default', layout: 'horizontal', labelLayout: 'fixed', labelWidth: '100px' },
        children: [
          { type: 'input', field: 'name', label: '姓名', input: true, id: 'dbg-1', props: { placeholder: '请输入' } },
          { type: 'radio', field: 'gender', label: '性别', input: true, id: 'dbg-2', props: { options: [{ label: '男', value: 'male' }, { label: '女', value: 'female' }] } },
          { type: 'date', field: 'entry', label: '入职日期', input: true, id: 'dbg-3', props: { type: 'date', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD' } },
        ],
      },
    ],
  }
  ;(window as any).__debugApply = (schema?: PageSchema) => applySchema(schema ?? sampleSchema, 'debug')
  // 模拟真实链路:原始 LLM 输出字符串 → repairContract → applySchema(覆盖包裹/修复路径)
  ;(window as any).__debugApplyRaw = async (raw: string) => {
    const { repairContract, countFields } = await import('../agent/validate')
    const r = repairContract(raw)
    if (!r.ok) return { ok: false, error: r.error }
    applySchema(r.schema, 'debug')
    return { ok: true, warnings: r.warnings, fieldCount: countFields(r.schema) }
  }
  ;(window as any).__debugState = () => ({
    ready: ready.value,
    lastAppliedId: store.lastAppliedId,
    canvasHasFields: !!document.querySelector('.ep-node-item'),
    canvasText: document.querySelector('.ep-canvas, .ep-edit-screen')?.textContent?.slice(0, 300) ?? '',
  })
}

function exportJson() {
  const data = getData() ?? starterSchema
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `schema-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  message.success('已导出 JSON 文件')
}

async function copyJson() {
  const data = getData() ?? starterSchema
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    message.success('已复制 JSON 到剪贴板')
  } catch {
    message.error('复制失败,浏览器可能未授予剪贴板权限')
  }
}

function clearAll() {
  Modal.confirm({
    title: '清空画布?',
    content: '将恢复为空白表单,此操作可点击设计器撤销按钮回退。',
    okText: '清空',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      designerRef.value?.reset()
      store.lastAppliedId = ''
    },
  })
}
</script>

<template>
  <div class="designer-wrap">
    <EDesigner
      ref="designerRef"
      :default-schema="starterSchema"
      :form-mode="USE_FORM_MODE"
      title="表单设计器"
      @ready="onReady"
      @save="onSave"
    >
      <template #header-right-suffix>
        <a-button size="small" @click="copyJson">复制 JSON</a-button>
        <a-button size="small" @click="exportJson">导出 JSON</a-button>
        <a-button size="small" danger @click="clearAll">清空</a-button>
      </template>
    </EDesigner>
  </div>
</template>
