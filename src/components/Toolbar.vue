<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { Tool } from '../engine/FractalPaint'
import Icon, { type IconName } from './Icon.vue'

defineProps<{
  canDeleteFrame: boolean
  helpOpen: boolean
}>()

const tool = defineModel<Tool>('tool', { required: true })

const emit = defineEmits<{
  addFrame: []
  deleteFrame: []
  shuffleFrames: []
  clearDrawing: []
  loadFile: [file: File]
  toggleHelp: []
}>()

const tools: { value: Tool; label: string; icon: IconName; shortcut: string }[] = [
  { value: 'draw', label: 'Draw', icon: 'draw', shortcut: 'D' },
  { value: 'erase', label: 'Erase', icon: 'erase', shortcut: 'E' },
  { value: 'frames', label: 'Frames', icon: 'frames', shortcut: 'F' },
]

const fileInput = useTemplateRef('fileInput')

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('loadFile', file)
  // Allow picking the same file again.
  input.value = ''
}
</script>

<template>
  <nav class="toolbar" aria-label="Tools">
    <div class="group" role="radiogroup" aria-label="Tool">
      <button
        v-for="t in tools"
        :key="t.value"
        type="button"
        role="radio"
        :aria-checked="tool === t.value"
        :class="{ active: tool === t.value }"
        :title="`${t.label} (${t.shortcut})`"
        @click="tool = t.value"
      >
        <Icon :name="t.icon" />
        <span class="label">{{ t.label }}</span>
      </button>
    </div>

    <div v-if="tool === 'frames'" class="group">
      <button type="button" title="Add frame" @click="emit('addFrame')">
        <Icon name="add" />
        <span class="label">Add</span>
      </button>
      <button type="button" title="Delete selected frame (Del)" :disabled="!canDeleteFrame" @click="emit('deleteFrame')">
        <Icon name="delete" />
        <span class="label">Delete</span>
      </button>
      <button type="button" title="Randomize frames" @click="emit('shuffleFrames')">
        <Icon name="shuffle" />
        <span class="label">Shuffle</span>
      </button>
    </div>
    <div v-else class="group">
      <button type="button" title="Use an image" @click="fileInput?.click()">
        <Icon name="image" />
        <span class="label">Image</span>
      </button>
      <button type="button" title="Clear drawing" @click="emit('clearDrawing')">
        <Icon name="clear" />
        <span class="label">Clear</span>
      </button>
    </div>

    <div class="group">
      <button type="button" title="Help" :aria-expanded="helpOpen" :class="{ active: helpOpen }" @click="emit('toggleHelp')">
        <Icon name="help" />
        <span class="label">Help</span>
      </button>
    </div>

    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
  </nav>
</template>

<style scoped>
.toolbar {
  position: fixed;
  left: 50%;
  bottom: calc(12px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 6px;
  max-width: calc(100vw - 16px);
  border-radius: 16px;
  background: rgb(28 28 30 / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.5);
  user-select: none;
  -webkit-user-select: none;
}

.group {
  display: flex;
  gap: 2px;
}

.group + .group {
  padding-left: 6px;
  border-left: 1px solid rgb(255 255 255 / 0.15);
}

button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 44px;
  min-height: 44px;
  padding: 4px 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
}

@media (hover: hover) {
  button:hover:not(:disabled) {
    background: rgb(255 255 255 / 0.1);
  }
}

button:focus-visible {
  outline: 2px solid #4cc9f0;
  outline-offset: -2px;
}

button.active {
  background: rgb(255 255 255 / 0.2);
  color: #ffd60a;
}

button:disabled {
  opacity: 0.35;
  cursor: default;
}

.label {
  font-size: 11px;
  line-height: 1;
}

@media (max-width: 480px) {
  .label {
    display: none;
  }
  .toolbar {
    gap: 4px;
  }
  .group + .group {
    padding-left: 4px;
  }
}
</style>
