import type { Settings } from './types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// deepseek-chat / deepseek-reasoner 已于 2026-07-24 退役,使用 V4 模型名
export const MODELS = [
  { label: 'DeepSeek V4 Flash(推荐)', value: 'deepseek-v4-flash' },
  { label: 'DeepSeek V4 Pro(更强推理)', value: 'deepseek-v4-pro' },
]

export const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const MAX_TOKENS = 4096
const TIMEOUT_MS = 120_000

export class ApiHttpError extends Error {
  status: number
  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
  }
}

export interface ChatResult {
  content: string
  finishReason: string
}

// 非流式调用(json 输出必须完整;加载态由 UI 呈现)
export async function chatJson(messages: ChatMessage[], settings: Settings): Promise<ChatResult> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: settings.temperature ?? 0.3,
        max_tokens: MAX_TOKENS,
        response_format: { type: 'json_object' },
        stream: false,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiHttpError(res.status, body?.error?.message ?? body?.message ?? res.statusText)
    }
    const data = await res.json()
    const choice = data.choices?.[0]
    if (!choice?.message?.content) throw new Error('EMPTY_CONTENT')
    return { content: choice.message.content, finishReason: choice.finish_reason ?? 'stop' }
  } finally {
    clearTimeout(timer)
  }
}

// HTTP/网络错误 → 中文提示
export function friendlyError(err: unknown): string {
  if (err instanceof ApiHttpError) {
    if (err.status === 401) return 'API Key 无效,请在设置中检查后重试'
    if (err.status === 402) return 'DeepSeek 账户余额不足,请充值后重试'
    if (err.status === 429) return '请求过于频繁,请稍后重试'
    return `DeepSeek 接口错误(${err.status}):${err.message}`
  }
  if (err instanceof Error && err.name === 'AbortError') return '请求超时(120 秒),请重试'
  if (err instanceof Error && err.message === 'EMPTY_CONTENT') return '模型返回了空内容,请重试'
  return '网络异常或请求失败,请检查网络后重试'
}
