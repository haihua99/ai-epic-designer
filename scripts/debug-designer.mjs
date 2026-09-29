// 无头浏览器验证设计器链路:ready 事件 → setData → 画布渲染。
// 使用本机 Edge(channel: 'msedge'),无需下载浏览器。
// 用法: npm run debug-designer
import { chromium } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const URL = 'http://localhost:5173/'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${(e.stack ?? '').split('\n').slice(0, 6).join('\n')}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 500)}`)
})
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`)
})

await page.goto(URL, { waitUntil: 'load', timeout: 30000 })
// 等设计器 Suspense 完成(库内部无独立标记,轮询调试钩子)
let state = null
for (let i = 0; i < 40; i++) {
  state = await page.evaluate(() => window.__debugState?.() ?? null)
  if (state?.ready) break
  await page.waitForTimeout(500)
}
console.log('1) ready 状态:', JSON.stringify(state))

// 注入样例 schema(直接 apply)
await page.evaluate(() => window.__debugApply?.())
await page.waitForTimeout(2000)
state = await page.evaluate(() => window.__debugState?.())
console.log('2) 直接注入后状态:', JSON.stringify(state))

// 模拟真实 LLM 链路:根节点是 page 且无 id(触发 validate 包裹路径,此前会崩溃)
const raw = JSON.stringify({
  reply: '已生成',
  pageSchema: {
    schemas: [
      {
        type: 'page', label: '页面',
        children: [
          { type: 'input', field: 'phone', label: '手机号', input: true, props: { placeholder: '请输入' } },
          { type: 'select', field: 'dept', label: '部门', input: true, props: { options: [{ label: '研发', value: 'dev' }, { label: '市场', value: 'mkt' }] } },
          { type: 'switch', field: 'dorm', label: '是否住宿', input: true, props: { checkedChildren: '是', unCheckedChildren: '否' } },
        ],
      },
    ],
  },
})
const rawResult = await page.evaluate((r) => window.__debugApplyRaw?.(r), raw)
console.log('3) 包裹路径(repairContract+apply)结果:', JSON.stringify(rawResult))
await page.waitForTimeout(2000)

state = await page.evaluate(() => window.__debugState?.())
console.log('4) 最终状态:', JSON.stringify(state))
await page.screenshot({ path: join(root, 'debug-designer.png'), fullPage: false })
console.log('5) 截图已保存: debug-designer.png')
console.log('6) 页面错误:', errors.length ? errors : '(无)')

await browser.close()
process.exit(0)
