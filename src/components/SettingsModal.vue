<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { MODELS } from '../agent/deepseek'
import { store, saveSettings } from '../store'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const apiKey = ref('')
const model = ref(store.settings.model)
const temperature = ref(store.settings.temperature)

// 每次打开时从 store 回填
watch(
  () => props.open,
  (v) => {
    if (v) {
      apiKey.value = store.settings.apiKey
      model.value = store.settings.model
      temperature.value = store.settings.temperature
    }
  },
)

function onOk() {
  const key = apiKey.value.trim()
  if (!key) {
    message.warning('请填写 API Key')
    return
  }
  store.settings.apiKey = key
  store.settings.model = model.value
  store.settings.temperature = temperature.value
  saveSettings()
  message.success('设置已保存')
  emit('close')
}
</script>

<template>
  <a-modal
    :open="open"
    title="设置"
    ok-text="保存"
    cancel-text="取消"
    @ok="onOk"
    @cancel="emit('close')"
  >
    <div class="settings-form">
      <div class="field">
        <label>DeepSeek API Key</label>
        <a-input-password
          v-model:value="apiKey"
          placeholder="sk-..."
          allow-clear
        />
        <p class="hint">Key 仅保存在本机浏览器 localStorage,直接由浏览器请求 DeepSeek 服务</p>
      </div>
      <div class="field">
        <label>模型</label>
        <a-radio-group v-model:value="model">
          <a-radio v-for="m in MODELS" :key="m.value" :value="m.value">{{ m.label }}</a-radio>
        </a-radio-group>
      </div>
      <div class="field">
        <label>温度(temperature):{{ temperature.toFixed(1) }}</label>
        <a-slider v-model:value="temperature" :min="0" :max="1" :step="0.1" />
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 8px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #555;
}

.field .hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #999;
}
</style>
