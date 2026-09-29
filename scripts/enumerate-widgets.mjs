// 枚举已安装的 @epic-designer/antd 包中注册的组件类型,
// 用于与 src/agent/catalog.ts 的 REGISTRY 白名单做 diff 核对。
// 用法: npm run enum-widgets
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = join(root, 'node_modules', '@epic-designer', 'antd')

if (!existsSync(pkg)) {
  console.error('未找到 node_modules/@epic-designer/antd,请先 npm install')
  process.exit(1)
}

const dist = join(pkg, 'dist')
const idxPath = existsSync(join(dist, 'index.mjs'))
  ? join(dist, 'index.mjs')
  : join(dist, 'index.js')
const src = readFileSync(idxPath, 'utf8')

// 从每个组件的 defaultSchema 对象中提取顶层 type 字段
// (按花括号深度追踪,避免误取 props 里的 type)
const parts = src.split('defaultSchema: {')
const types = new Set()
for (let i = 1; i < parts.length; i++) {
  const lines = parts[i].split('\n')
  let depth = 0
  for (const line of lines) {
    if (line.includes('{')) depth++
    if (line.includes('}')) depth--
    const m = depth === 0 ? line.match(/type:\s*"([a-z][a-z0-9-]*)"/) : null
    if (m) {
      types.add(m[1])
      break
    }
    if (depth < 0) break
  }
}

console.log('== @epic-designer/antd 注册的组件类型 ==')
console.log([...types].sort().join(', '))
console.log(`\n共 ${types.size} 个,请与 src/agent/catalog.ts 的 REGISTRY 对齐`)
