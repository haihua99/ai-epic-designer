import { createApp } from 'vue'
// 顺序敏感:先 epic-designer 样式,再 antd reset
import 'epic-designer/dist/style.css'
import 'ant-design-vue/dist/reset.css'
// 注册 antd 适配器 —— 必须在 EDesigner 挂载前,否则设计器永久 loading
import { setupAntd } from '@epic-designer/antd'
setupAntd()
import Antd from 'ant-design-vue'
import App from './components/App.vue'
import './styles/global.css'

const app = createApp(App)
app.use(Antd)
app.mount('#app')
