import type { PageSchema } from './types'

// 表单根节点的权威默认 props(来自 @epic-designer/antd 注册源码)
export const FORM_PROPS = {
  name: 'default',
  layout: 'horizontal',
  labelLayout: 'fixed',
  labelWidth: '100px',
  labelCol: { span: 5 },
  wrapperCol: { span: 19 },
}

// 初始空表单:挂载期 defaultSchema 与"清空"按钮共用
export const starterSchema: PageSchema = {
  canvas: { mode: 'desktop' },
  schemas: [
    { type: 'form', id: 'root', label: '新建表单', props: { ...FORM_PROPS }, children: [] },
  ],
}
