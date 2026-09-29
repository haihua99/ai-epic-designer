// 用 esbuild 打包 validate-smoke.ts 后在 node 中运行(项目无 tsx 依赖)
import { buildSync } from 'esbuild'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = join(root, 'node_modules', '.tmp', 'validate-smoke.cjs')

buildSync({
  entryPoints: [join(root, 'scripts', 'validate-smoke.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile,
  logLevel: 'silent',
})

const res = spawnSync(process.execPath, [outfile], { stdio: 'inherit' })
rmSync(outfile, { force: true })
process.exit(res.status ?? 1)
