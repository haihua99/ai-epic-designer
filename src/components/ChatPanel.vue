<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { store, designerBridge } from '../store'
import { uid } from '../agent/uid'
import { buildSystemPrompt } from '../agent/prompt'
import { chatJson, friendlyError, type ChatMessage } from '../agent/deepseek'
import { repairContract, countFields } from '../agent/validate'
import type { ChatMsg } from '../agent/types'

const emit = defineEmits<{ (e: 'open-settings'): void }>()

const input = ref('')
const listRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    const el = listRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

// 组装发给 LLM 的消息:system + 裁剪历史(首条需求 + 最近 6 条) + 当前画布 schema + 新需求
function buildMessages(text: string): ChatMessage[] {
  const msgs: ChatMessage[] = [{ role: 'system', content: buildSystemPrompt() }]

  const first = store.messages.find((m) => m.role === 'user')
  const picked = new Map<string, ChatMsg>()
  if (first) picked.set(first.id, first)
  for (const m of store.messages.slice(-6)) picked.set(m.id, m)
  for (const m of picked.values()) {
    msgs.push({ role: m.role, content: m.text })
  }

  const current = designerBridge.getData?.()
  if (current && countFields(current) > 0) {
    msgs.push({
      role: 'user',
      content: `【当前画布上的表单 schema,请以它为基础进行修改,保留其中未被提及的字段】:\n${JSON.stringify(current)}`,
    })
  }

  msgs.push({ role: 'user', content: text })
  return msgs
}

async function send() {
  const text = input.value.trim()
  if (!text || store.generating) return
  // 无 key 时引导打开设置,不发起请求
  if (!store.settings.apiKey) {
    emit('open-settings')
    return
  }
  input.value = ''
  store.messages.push({ id: uid(), role: 'user', text })
  store.generating = true
  scrollToBottom()
  try {
    const base = buildMessages(text)
    let out = await chatJson(base, store.settings)
    let parsed = repairContract(out.content)
    let reason: string | null =
      out.finishReason === 'length' ? '输出因超出长度限制被截断' : null

    // 截断 / 解析失败共用纠错重试通道,最多 2 次
    for (let attempt = 0; attempt < 2; attempt++) {
      reason = reason ?? (parsed.ok ? null : (parsed.error ?? '输出格式不符合约定'))
      if (!reason) break
      base.push({ role: 'assistant', content: out.content })
      base.push({
        role: 'user',
        content: `你上次的输出存在问题:${reason}。请重新输出完整、合法的 JSON 对象,不要包含任何多余文字或代码块。`,
      })
      out = await chatJson(base, store.settings)
      reason = out.finishReason === 'length' ? '输出因超出长度限制被截断' : null
      parsed = repairContract(out.content)
    }

    if (!parsed.ok) throw new Error(parsed.error ?? '模型输出无法解析')

    const msg: ChatMsg = {
      id: uid(),
      role: 'assistant',
      text: parsed.reply || '(模型未提供说明)',
      schema: parsed.schema,
      fieldCount: countFields(parsed.schema),
      warnings: parsed.warnings,
      status: parsed.warnings.length ? 'repair' : 'ok',
    }
    store.messages.push(msg)
    // 自动加载到设计器
    designerBridge.apply?.(parsed.schema, msg.id)
  } catch (err) {
    store.messages.push({
      id: uid(),
      role: 'assistant',
      text: friendlyError(err),
      status: 'error',
    })
  } finally {
    store.generating = false
    scrollToBottom()
  }
}

function loadMsg(msg: ChatMsg) {
  if (msg.schema) designerBridge.apply?.(msg.schema, msg.id)
}
</script>

<template>
  <div class="chat-panel">
    <header class="chat-header">
      <span class="title">AI 表单助手</span>
      <a-button size="small" type="text" @click="emit('open-settings')">设置</a-button>
    </header>

    <div ref="listRef" class="chat-list">
      <div v-if="!store.messages.length" class="empty-tip">
        <p>用一句话描述你想要的表单,AI 将生成并加载到右侧设计器</p>
        <p class="eg">例如:做一个员工入职信息登记表,包含姓名、手机号、部门、入职日期</p>
      </div>

      <div v-for="msg in store.messages" :key="msg.id" class="msg" :class="msg.role">
        <div v-if="msg.role === 'user'" class="bubble user">{{ msg.text }}</div>
        <div v-else class="bubble assistant">
          <div class="reply">{{ msg.text }}</div>

          <div v-if="msg.status === 'error'" class="meta">
            <a-tag color="error">失败</a-tag>
          </div>

          <template v-else-if="msg.schema">
            <div class="meta">
              <a-tag :color="msg.status === 'repair' ? 'warning' : 'success'">
                {{ msg.status === 'repair' ? `已自动修复 ${msg.warnings!.length} 处` : '已生成' }}
              </a-tag>
              <span class="field-count">共 {{ msg.fieldCount }} 个字段</span>
            </div>
            <div v-if="msg.warnings && msg.warnings.length" class="warnings">
              {{ msg.warnings.join(';') }}
            </div>
            <div class="actions">
              <a-button
                size="small"
                :type="store.lastAppliedId === msg.id ? 'primary' : 'default'"
                @click="loadMsg(msg)"
              >
                {{ store.lastAppliedId === msg.id ? '已在设计器中' : '加载到设计器' }}
              </a-button>
            </div>
          </template>
        </div>
      </div>

      <div v-if="store.generating" class="msg assistant">
        <div class="bubble assistant generating">
          <a-spin size="small" />
          <span>正在生成表单,请稍候…</span>
        </div>
      </div>
    </div>

    <footer class="chat-input">
      <a-textarea
        v-model:value="input"
        :auto-size="{ minRows: 1, maxRows: 4 }"
        placeholder="描述你的表单需求,Enter 发送,Shift+Enter 换行"
        :disabled="store.generating"
        @keydown.enter.exact.prevent="send"
      />
      <a-button type="primary" :loading="store.generating" @click="send">发送</a-button>
    </footer>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.chat-header .title {
  font-size: 15px;
  font-weight: 600;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-tip {
  margin: auto;
  text-align: center;
  color: #999;
  font-size: 13px;
  line-height: 1.8;
  padding: 0 16px;
}

.empty-tip .eg {
  color: #bbb;
  font-size: 12px;
}

.msg {
  display: flex;
}

.msg.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 92%;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.bubble.user {
  background: #1677ff;
  color: #fff;
  white-space: pre-wrap;
}

.bubble.assistant {
  background: #f5f5f5;
  color: #333;
}

.bubble.assistant .reply {
  white-space: pre-wrap;
}

.bubble.generating {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.field-count {
  color: #888;
  font-size: 12px;
}

.warnings {
  margin-top: 6px;
  color: #d48806;
  font-size: 12px;
}

.actions {
  margin-top: 8px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
  align-items: flex-end;
}

.chat-input .ant-input {
  flex: 1;
}
</style>
