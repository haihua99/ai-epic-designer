// LLM 输出 → 可加载 PageSchema 的修复管线:
// 剥围栏 → JSON.parse → 结构校验 → 递归 normalize(白名单过滤/补 id/field/rules/format)
import { REGISTRY, PROPS_ALLOWED, CONTAINER_TYPES, isOptionType, CHOOSE_TYPES } from './catalog'
import { FORM_PROPS } from './starter-schema'
import { uid } from './uid'
import type { ComponentSchema, PageSchema } from './types'

export interface RepairResult {
  ok: boolean
  reply: string
  schema: PageSchema
  warnings: string[]
  /** 失败原因(ok=false 时) */
  error?: string
}

const FIELD_RE = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/
const MAX_DEPTH = 12

// date 组件的 props.type → 默认 format/valueFormat
const DATE_FORMAT: Record<string, string> = {
  date: 'YYYY-MM-DD',
  daterange: 'YYYY-MM-DD',
  week: 'YYYY-ww',
  weekrange: 'YYYY-ww',
  month: 'YYYY-MM',
  monthrange: 'YYYY-MM',
  quarter: 'YYYY-Q',
  quarterrange: 'YYYY-Q',
  year: 'YYYY',
  yearrange: 'YYYY',
}

interface WalkCtx {
  seen: Set<string>
  warnings: string[]
  depth: number
  fieldSeq: number
}

export function repairContract(raw: string): RepairResult {
  const warnings: string[] = []
  const fail = (error: string): RepairResult => ({
    ok: false, reply: '', schema: emptyPage(), warnings, error,
  })

  let text = raw.trim()
  // 容忍模型加 ```json 围栏:截取最外层 { ... }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return fail('输出中未找到 JSON 对象')
  text = text.slice(start, end + 1)

  let obj: any
  try {
    obj = JSON.parse(text)
  } catch {
    return fail('JSON 解析失败')
  }
  if (!obj || typeof obj !== 'object') return fail('输出不是 JSON 对象')

  // 契约: { reply, pageSchema };也容忍直接返回 schema
  const ps = 'pageSchema' in obj ? obj.pageSchema : obj
  if (!ps || typeof ps !== 'object') return fail('缺少 pageSchema 字段')

  let schema: PageSchema
  try {
    schema = normalizePage(ps, warnings)
  } catch (err) {
    return fail(err instanceof Error ? `schema 结构不合法:${err.message}` : 'schema 结构不合法')
  }

  return {
    ok: true,
    reply: typeof obj.reply === 'string' ? obj.reply : '',
    schema,
    warnings,
  }
}

function normalizePage(ps: any, warnings: string[]): PageSchema {
  const rawNodes = Array.isArray(ps?.schemas) ? ps.schemas : Array.isArray(ps) ? ps : null
  if (!rawNodes) throw new Error('schemas 不是数组')

  const ctx: WalkCtx = { seen: new Set(), warnings, depth: 0, fieldSeq: 0 }
  const first = rawNodes[0]

  // 根节点必须是 form;否则(如模型返回 page 根或直接返回字段数组)包一层表单容器。
  // 注意:根节点必须有 id,否则 setData 内部选择节点时用空 id 查找会失败,导致设计器渲染异常。
  let root: ComponentSchema | null
  if (first && typeof first === 'object' && first.type === 'form') {
    root = walk(first, ctx)
    if (rawNodes.length > 1) warnings.push('schemas 含多个根节点,多余节点已丢弃')
  } else {
    warnings.push('根节点不是表单容器,已自动包一层 form 容器')
    // 根带 children 时(如 page 容器),取其 children 作为表单字段;否则把全部节点当字段
    const kids = first && typeof first === 'object' && Array.isArray(first.children)
      ? first.children
      : rawNodes
    const walkedKids = kids
      .map((n: any) => walk(n, ctx))
      .filter((n: unknown): n is ComponentSchema => n !== null)
    if (!walkedKids.length) throw new Error('没有可用的表单字段')
    root = { type: 'form', id: uid(), label: '表单', props: { ...FORM_PROPS }, children: walkedKids }
  }
  if (!root) throw new Error('没有可用的表单字段')

  const schema: PageSchema = { canvas: { mode: 'desktop' }, schemas: [root] }
  if (typeof ps?.script === 'string' && ps.script) schema.script = ps.script
  return schema
}

function walk(n: any, ctx: WalkCtx): ComponentSchema | null {
  if (!n || typeof n !== 'object' || typeof n.type !== 'string') {
    ctx.warnings.push('存在结构异常的节点,已丢弃')
    return null
  }
  const meta = REGISTRY[n.type]
  if (!meta) {
    ctx.warnings.push(`未知组件类型 "${n.type}",已剔除`)
    return null
  }
  if (ctx.depth >= MAX_DEPTH) {
    ctx.warnings.push('嵌套层级过深,已截断')
    return null
  }

  const node: ComponentSchema = { type: n.type }
  node.input = meta.input
  if (typeof n.label === 'string' && n.label) node.label = n.label
  node.id = typeof n.id === 'string' && n.id ? n.id : uid()

  if (meta.input) {
    node.field = normalizeField(n.field, node.label, ctx)
  }
  node.props = filterProps(n.type, n.props, ctx.warnings)

  if (meta.input) {
    const rules = normalizeRules(n.type, n.rules, node.label)
    if (rules) node.rules = rules
  }

  if (CONTAINER_TYPES.has(n.type)) {
    const kids = Array.isArray(n.children) ? n.children : []
    node.children = kids
      .map((k: any) => walk(k, { ...ctx, depth: ctx.depth + 1 }))
      .filter((k: unknown): k is ComponentSchema => k !== null)
  }
  return node
}

function normalizeField(field: any, label: string | undefined, ctx: WalkCtx): string {
  if (typeof field === 'string' && FIELD_RE.test(field) && !ctx.seen.has(field)) {
    ctx.seen.add(field)
    return field
  }
  let derived = ''
  do {
    derived = `f_${ctx.fieldSeq++}`
  } while (ctx.seen.has(derived))
  ctx.seen.add(derived)
  ctx.warnings.push(`字段 "${label ?? field}" 的 field 名缺失或非法,已改为 ${derived}`)
  return derived
}

function filterProps(type: string, props: any, warnings: string[]): Record<string, any> {
  const out: Record<string, any> = {}
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    const allowed = PROPS_ALLOWED[type] ?? []
    for (const [k, v] of Object.entries(props)) {
      if (allowed.includes(k) && v !== undefined) out[k] = v
    }
  }

  // 选项类组件:options 必须为 [{label, value}]
  if (isOptionType(type)) {
    if (!Array.isArray(out.options)) {
      out.options = [
        { label: '选项一', value: 'option1' },
        { label: '选项二', value: 'option2' },
      ]
      warnings.push(`一个 ${type} 组件缺少 options,已补充默认选项`)
    } else {
      const fixed = out.options
        .map((o: any) =>
          typeof o === 'string'
            ? { label: o, value: o }
            : { label: o?.label ?? o?.value ?? '选项', value: o?.value ?? o?.label ?? '选项' },
        )
        .filter((o: any) => o.value)
      if (fixed.length) out.options = fixed
      else out.options = [{ label: '选项一', value: 'option1' }]
    }
  }

  // cascader 选项保留 children 级联结构
  if (type === 'cascader' && Array.isArray(out.options)) {
    const fix = (o: any): any => {
      if (typeof o === 'string') return { label: o, value: o }
      const item: Record<string, any> = { label: o?.label ?? o?.value ?? '选项', value: o?.value ?? o?.label ?? '选项' }
      if (Array.isArray(o?.children)) item.children = o.children.map(fix)
      return item
    }
    out.options = out.options.map(fix)
  }

  // date:按 type 补默认 format/valueFormat
  if (type === 'date') {
    const dp = typeof out.type === 'string' ? out.type : 'date'
    const fmt = DATE_FORMAT[dp] ?? 'YYYY-MM-DD'
    if (typeof out.format !== 'string') out.format = fmt
    if (typeof out.valueFormat !== 'string') out.valueFormat = fmt
  }
  return out
}

function normalizeRules(
  type: string,
  rules: any,
  label: string | undefined,
): Array<Record<string, any>> | undefined {
  if (!Array.isArray(rules)) return undefined
  const out: Array<Record<string, any>> = []
  for (const r of rules) {
    if (!r || typeof r !== 'object') continue
    const rule: Record<string, any> = {}
    if (typeof r.required === 'boolean') rule.required = r.required
    else if (typeof r.required === 'string') rule.required = r.required === 'true'
    if (typeof r.message === 'string' && r.message) rule.message = r.message
    if (typeof r.trigger === 'string') rule.trigger = r.trigger
    if (typeof r.type === 'string') rule.type = r.type
    if (r.pattern !== undefined) rule.pattern = r.pattern
    if (r.min !== undefined) rule.min = r.min
    if (r.max !== undefined) rule.max = r.max
    if (!rule.required && rule.pattern === undefined && rule.min === undefined && rule.max === undefined) continue
    if (rule.required && !rule.message) {
      rule.message = CHOOSE_TYPES.has(type) ? `请选择${label ?? ''}` : `请输入${label ?? ''}`
    }
    out.push(rule)
  }
  return out.length ? out : undefined
}

// 统计表单输入字段数
export function countFields(schema: PageSchema | null | undefined): number {
  if (!schema) return 0
  let n = 0
  const visit = (node: any): void => {
    if (!node || typeof node !== 'object') return
    if (node.input) n++
    if (Array.isArray(node.children)) node.children.forEach(visit)
  }
  ;(schema.schemas ?? []).forEach(visit)
  return n
}

// 空表单(修复失败时的占位)
function emptyPage(): PageSchema {
  return { canvas: { mode: 'desktop' }, schemas: [{ type: 'form', id: 'root', props: { ...FORM_PROPS }, children: [] }] }
}
