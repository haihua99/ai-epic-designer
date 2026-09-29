import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

// vite-plugin-monaco-editor@1.1.0 是 CJS 包,部分加载路径下 default 导出被包在 .default 里
const monacoPlugin = (monacoEditorPlugin as any).default ?? monacoEditorPlugin

export default defineConfig({
  plugins: [
    vue(),
    monacoPlugin({ languageWorkers: ['editorWorkerService', 'json'] }),
  ],
  base: './',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 4000 },
})
