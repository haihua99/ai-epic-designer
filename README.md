# AI 表单智能体(ai-form)

基于 [epic-designer](https://github.com/Kchengz/epic-designer) + DeepSeek 大模型的表单生成智能体:
用自然语言描述需求,AI 生成表单 schema 并加载到右侧设计器实时预览,支持多轮对话迭代修改。

- 技术栈:Vite 6 + Vue 3.5 + TypeScript + Ant Design Vue 4 + `epic-designer@1.1.13`(antd 适配器)
- 架构:纯前端直连 DeepSeek API(已实测支持 CORS),API key 仅存本机浏览器 localStorage
- 模型:`deepseek-v4-flash`(默认)/ `deepseek-v4-pro`(`deepseek-chat`/`deepseek-reasoner` 已于 2026-07-24 退役)

## 运行

```bash
npm install            # 国内网络建议加 --registry=https://registry.npmmirror.com
npm run dev            # http://localhost:5173
```

打开页面后:点击左上角 **设置** → 填入 [DeepSeek API Key](https://platform.deepseek.com/) → 保存。
然后在左侧输入需求,例如:

> 做一个员工入职信息登记表,包含姓名、手机号、部门、入职日期、是否住宿

生成后表单自动加载到右侧设计器,可继续对话修改("把手机号改成必填,再加一个班次下拉"),
或直接在设计器里手动拖拽编辑。设计器头部提供 **复制 JSON / 导出 JSON / 清空** 按钮。

## 其他命令

```bash
npm run build           # 类型检查 + 生产构建
npm run preview         # 预览生产构建
npm run enum-widgets    # 枚举已安装 @epic-designer/antd 的组件类型,与 src/agent/catalog.ts 核对
npm run smoke           # validate 修复管线冒烟测试(23 项)
npm run debug-designer  # 无头浏览器(本机 Edge)验证设计器链路:ready→setData→画布渲染
```

## 工作原理

1. 用户输入需求 → `src/agent/prompt.ts` 组装中文 system prompt(含组件目录与输出契约)
2. `src/agent/deepseek.ts` 非流式调用 DeepSeek(`response_format: json_object`),
   要求输出 `{"reply": "...", "pageSchema": {...}}`
3. `src/agent/validate.ts` 修复管线:剥围栏 → 解析 → 白名单过滤/补 id/field/rules/format →
   根节点强制 `form` 容器
4. `DesignerPanel.vue` 通过 `setData()` 加载到设计器(等 `ready` 事件后);多轮对话时
   把当前画布 schema 注入上下文,实现增量修改
5. 截断/解析失败自动纠错重试最多 2 次;HTTP 错误映射为中文提示

## 目录结构

```
src/
├── agent/          # 智能体核心:prompt/catalog/validate/deepseek
├── components/     # ChatPanel(聊天)/ DesignerPanel(设计器)/ SettingsModal(设置)
├── store.ts        # 模块级 reactive store + 设计器桥
└── main.ts         # CSS 导入顺序敏感 + setupAntd()
```

## 说明与限制

- 组件类型名以 `npm run enum-widgets` 的实际输出为准(antd 适配器用 `number`/`date`/`time`,
  而非 element-plus 系的 `input-number`/`date-picker`/`time-picker`)。
- 聊天记录不持久化(仅 key/model/temperature 存 localStorage),刷新后清空。
- 生成结果如含未知组件类型会被校验管线剔除并在消息卡上提示。
