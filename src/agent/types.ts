// 组件 schema 节点(与 epic-designer 的 ComponentSchema 对齐)
export interface ComponentSchema {
  type: string
  field?: string
  label?: string
  input?: boolean
  props?: Record<string, any>
  rules?: Array<Record<string, any>>
  id?: string
  children?: ComponentSchema[]
}

// 页面 schema(epic-designer 的 PageSchema)
export interface PageSchema {
  canvas?: { mode?: 'desktop' | 'mobile' | 'pad' | 'pc' | 'tablet'; height?: string; width?: string }
  schemas: ComponentSchema[]
  script?: string
}

// 聊天消息
export interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** assistant 消息附带的生成结果 */
  schema?: PageSchema
  fieldCount?: number
  /** validate 修复管线的告警 */
  warnings?: string[]
  status?: 'ok' | 'repair' | 'error'
}

// 用户设置(存 localStorage)
export interface Settings {
  apiKey: string
  model: string
  temperature: number
}
