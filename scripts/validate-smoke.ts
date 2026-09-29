// validate 修复管线冒烟测试:用 node 跑,验证核心逻辑。
// 运行: npm run smoke
import { repairContract, countFields } from '../src/agent/validate'

let pass = 0
let fail = 0

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('[1] 标准契约输出')
{
  const raw = JSON.stringify({
    reply: '已生成员工登记表',
    pageSchema: {
      canvas: { mode: 'desktop' },
      schemas: [
        {
          type: 'form', label: '员工登记表',
          props: { name: 'default', layout: 'horizontal', labelWidth: '100px' },
          children: [
            { type: 'input', field: 'name', label: '姓名', input: true, props: { placeholder: '请输入' }, rules: [{ required: true, message: '请输入姓名' }] },
            { type: 'select', field: 'dept', label: '部门', input: true, props: { options: [{ label: '研发', value: 'dev' }] } },
            { type: 'date', field: 'entry', label: '入职日期', input: true, props: { type: 'date' } },
          ],
        },
      ],
    },
  })
  const r = repairContract(raw)
  check('ok', r.ok, r.error)
  check('reply 提取', r.reply === '已生成员工登记表')
  check('字段数 = 3', countFields(r.schema) === 3, String(countFields(r.schema)))
  const root = r.schema.schemas[0]
  check('根为 form', root.type === 'form')
  const dateNode = root.children!.find((c) => c.type === 'date')!
  check('date 补默认 format', dateNode.props!.format === 'YYYY-MM-DD', JSON.stringify(dateNode.props))
  check('无告警', r.warnings.length === 0, JSON.stringify(r.warnings))
}

console.log('[2] 带 ```json 围栏')
{
  const inner = JSON.stringify({ reply: 'ok', pageSchema: { schemas: [{ type: 'form', children: [{ type: 'input', field: 'a', label: 'A' }] }] } })
  const r = repairContract('```json\n' + inner + '\n```')
  check('剥离围栏后 ok', r.ok && countFields(r.schema) === 1, r.error)
}

console.log('[3] 根不是 form(字段数组)自动包裹')
{
  const raw = JSON.stringify({ reply: 'x', pageSchema: { schemas: [{ type: 'input', field: 'a', label: 'A' }, { type: 'textarea', field: 'b', label: 'B' }] } })
  const r = repairContract(raw)
  check('ok', r.ok, r.error)
  check('包了一层 form', r.schema.schemas[0].type === 'form')
  check('字段数 = 2', countFields(r.schema) === 2)
  check('有包裹告警', r.warnings.some((w) => w.includes('包一层')))
}

console.log('[3b] 根是 page 容器(无 id,不在白名单)→ 取 children 包裹,根有 id')
{
  const raw = JSON.stringify({
    reply: 'x',
    pageSchema: { schemas: [{ type: 'page', label: '页面', children: [{ type: 'input', field: 'a', label: 'A' }] }] },
  })
  const r = repairContract(raw)
  check('ok', r.ok, r.error)
  const root = r.schema.schemas[0]
  check('根为 form', root.type === 'form')
  check('根有 id(防设计器选择崩溃)', typeof root.id === 'string' && root.id.length > 0, String(root.id))
  check('字段数 = 1', countFields(r.schema) === 1)
  check('有包裹告警', r.warnings.some((w) => w.includes('包一层')))
}

console.log('[4] 未知类型剔除 + field 缺失派生')
{
  const raw = JSON.stringify({
    reply: 'x',
    pageSchema: { schemas: [{ type: 'form', children: [{ type: 'quantum', field: 'q', label: 'Q' }, { type: 'input', field: 'bad name!', label: '坏名字' }, { type: 'input', label: '无名字' }] }] },
  })
  const r = repairContract(raw)
  const kids = r.schema.schemas[0].children!
  check('未知类型被剔除', !kids.some((k) => k.type === 'quantum'))
  check('非法 field 被派生', kids[0].field === 'f_0', JSON.stringify(kids.map((k) => k.field)))
  check('缺失 field 被派生', kids[1].field === 'f_1')
  check('剔除告警存在', r.warnings.some((w) => w.includes('quantum')))
}

console.log('[5] options 字符串数组转 {label,value}')
{
  const raw = JSON.stringify({
    reply: 'x',
    pageSchema: { schemas: [{ type: 'form', children: [{ type: 'radio', field: 'g', label: 'G', props: { options: ['男', '女'] } }] }] },
  })
  const r = repairContract(raw)
  const opts = r.schema.schemas[0].children![0].props!.options as any[]
  check('转为对象数组', opts.every((o) => typeof o === 'object' && o.label === o.value))
}

console.log('[6] 非法 JSON 失败')
{
  const r = repairContract('这是一段纯文本,没有 json')
  check('失败且带错误', !r.ok && !!r.error, r.error)
}

console.log('[7] 输出缺 pageSchema 失败')
{
  const r = repairContract(JSON.stringify({ foo: 1 }))
  check('失败', !r.ok)
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
if (fail) process.exit(1)
