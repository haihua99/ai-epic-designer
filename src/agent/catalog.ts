// 组件目录:LLM 字段目录 + 校验白名单。
// REGISTRY 与 @epic-designer/antd@1.1.13 注册源码一致,由 scripts/enumerate-widgets.mjs 核对。

// 已注册组件类型 → 是否为表单输入项(值会进入表单数据)
export const REGISTRY: Record<string, { input: boolean }> = {
  form: { input: false },
  'form-item': { input: false },
  input: { input: true },
  textarea: { input: true },
  number: { input: true },
  radio: { input: true },
  checkbox: { input: true },
  select: { input: true },
  slider: { input: true },
  switch: { input: true },
  date: { input: true },
  time: { input: true },
  cascader: { input: true },
  'upload-image': { input: true },
  'upload-file': { input: true },
  'color-picker': { input: true },
  button: { input: false },
  card: { input: false },
  row: { input: false },
  col: { input: false },
  modal: { input: false },
  tabs: { input: false },
  'tab-pane': { input: false },
}

// 允许进入 props 的字段白名单(防 LLM 塞入无关属性导致渲染异常)
export const PROPS_ALLOWED: Record<string, string[]> = {
  form: ['name', 'layout', 'labelLayout', 'labelWidth', 'labelCol', 'wrapperCol', 'labelAlign', 'colon'],
  'form-item': [],
  input: ['placeholder', 'defaultValue', 'type', 'maxlength', 'showCount', 'allowClear', 'disabled', 'size', 'addonBefore', 'addonAfter', 'style'],
  textarea: ['placeholder', 'defaultValue', 'rows', 'maxlength', 'showCount', 'allowClear', 'disabled', 'style'],
  number: ['placeholder', 'defaultValue', 'min', 'max', 'step', 'precision', 'disabled', 'addonBefore', 'addonAfter', 'style'],
  select: ['placeholder', 'defaultValue', 'options', 'mode', 'showSearch', 'allowClear', 'disabled', 'size', 'style'],
  radio: ['defaultValue', 'options', 'disabled', 'optionType', 'style'],
  checkbox: ['defaultValue', 'options', 'disabled', 'style'],
  date: ['type', 'placeholder', 'format', 'valueFormat', 'defaultValue', 'disabled', 'showTime', 'style'],
  time: ['placeholder', 'format', 'valueFormat', 'defaultValue', 'disabled', 'style'],
  switch: ['defaultValue', 'checkedChildren', 'unCheckedChildren', 'disabled', 'style'],
  slider: ['defaultValue', 'min', 'max', 'step', 'disabled', 'range', 'style'],
  cascader: ['placeholder', 'defaultValue', 'options', 'disabled', 'style'],
  'color-picker': ['defaultValue', 'disabled', 'style'],
  'upload-image': [],
  'upload-file': [],
  button: ['type', 'size', 'disabled', 'style'],
  card: ['title', 'bordered', 'size', 'style'],
  row: ['gutter', 'justify', 'align', 'style'],
  col: ['span', 'offset', 'style'],
  modal: ['title', 'width', 'style'],
  tabs: ['type', 'style'],
  'tab-pane': ['label', 'style'],
}

// 容器类组件(允许 children)
export const CONTAINER_TYPES = new Set(['form', 'row', 'col', 'card', 'modal', 'tabs', 'tab-pane'])

// 选项类组件(需要 options 数组)
const OPTION_TYPES = new Set(['select', 'radio', 'checkbox'])

export function isOptionType(type: string): boolean {
  return OPTION_TYPES.has(type)
}

// 选择类组件(校验 message 用"请选择")
export const CHOOSE_TYPES = new Set(['select', 'radio', 'checkbox', 'date', 'time', 'cascader'])

export interface CatalogEntry {
  type: string
  desc: string
  template: Record<string, unknown>
}

// 开放给 LLM 的字段目录(~14 种常用;upload/modal/tabs 等不进目录,只留校验白名单)
export const CATALOG: CatalogEntry[] = [
  {
    type: 'input',
    desc: '单行文本,用于姓名、手机号、地址等',
    template: {
      type: 'input', field: 'name', label: '姓名', input: true,
      props: { placeholder: '请输入', maxlength: 50, allowClear: true },
      rules: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    },
  },
  {
    type: 'textarea',
    desc: '多行文本,用于备注、简介等长文本',
    template: {
      type: 'textarea', field: 'remark', label: '备注', input: true,
      props: { placeholder: '请输入', rows: 4, maxlength: 200, showCount: true },
    },
  },
  {
    type: 'number',
    desc: '数字输入,用于年龄、数量、金额等',
    template: {
      type: 'number', field: 'age', label: '年龄', input: true,
      props: { placeholder: '请输入', min: 0, max: 150, step: 1, addonAfter: '岁' },
    },
  },
  {
    type: 'select',
    desc: '下拉选择,选项较多或需搜索时用;多选加 props.mode: "multiple"',
    template: {
      type: 'select', field: 'department', label: '部门', input: true,
      props: { placeholder: '请选择', options: [{ label: '研发部', value: 'dev' }, { label: '市场部', value: 'mkt' }], allowClear: true },
      rules: [{ required: true, message: '请选择部门', trigger: 'change' }],
    },
  },
  {
    type: 'radio',
    desc: '单选,选项 2-5 个时优先使用',
    template: {
      type: 'radio', field: 'gender', label: '性别', input: true,
      props: { options: [{ label: '男', value: 'male' }, { label: '女', value: 'female' }] },
    },
  },
  {
    type: 'checkbox',
    desc: '多选',
    template: {
      type: 'checkbox', field: 'hobbies', label: '兴趣爱好', input: true,
      props: { options: [{ label: '阅读', value: 'reading' }, { label: '运动', value: 'sports' }] },
    },
  },
  {
    type: 'date',
    desc: '日期选择;props.type 可选 date/week/month/quarter/year 及对应 range(如 daterange)',
    template: {
      type: 'date', field: 'entryDate', label: '入职日期', input: true,
      props: { type: 'date', placeholder: '请选择', format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD' },
    },
  },
  {
    type: 'time',
    desc: '时间选择',
    template: {
      type: 'time', field: 'startTime', label: '开始时间', input: true,
      props: { placeholder: '请选择', format: 'HH:mm:ss', valueFormat: 'HH:mm:ss' },
    },
  },
  {
    type: 'switch',
    desc: '开关,是/否类二值选择',
    template: {
      type: 'switch', field: 'dormitory', label: '是否住宿', input: true,
      props: { checkedChildren: '是', unCheckedChildren: '否' },
    },
  },
  {
    type: 'slider',
    desc: '滑块,数值区间选择',
    template: {
      type: 'slider', field: 'satisfaction', label: '满意度', input: true,
      props: { min: 0, max: 100, step: 1 },
    },
  },
  {
    type: 'cascader',
    desc: '级联选择,用于省市等多级选项',
    template: {
      type: 'cascader', field: 'region', label: '所在地区', input: true,
      props: {
        placeholder: '请选择',
        options: [{ label: '广东省', value: 'gd', children: [{ label: '深圳市', value: 'sz' }] }],
      },
    },
  },
  {
    type: 'color-picker',
    desc: '颜色选择',
    template: {
      type: 'color-picker', field: 'themeColor', label: '主题色', input: true,
      props: { defaultValue: '#1677ff' },
    },
  },
  {
    type: 'card',
    desc: '卡片容器,用于给字段分组',
    template: {
      type: 'card', label: '分组标题',
      props: { title: '分组标题', bordered: true },
      children: [],
    },
  },
  {
    type: 'row',
    desc: '栅格行容器,配合 col 实现多列布局',
    template: {
      type: 'row', children: [
        { type: 'col', props: { span: 12 }, children: [] },
        { type: 'col', props: { span: 12 }, children: [] },
      ],
    },
  },
  {
    type: 'col',
    desc: '栅格列,span 取 1-24,必须放在 row 内',
    template: { type: 'col', props: { span: 12 }, children: [] },
  },
]
