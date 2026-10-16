<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import HelpPanel from './components/HelpPanel.vue'
import Toolbar from './components/Toolbar.vue'
import { FractalPaint, type Tool } from './engine/FractalPaint'
import titleUrl from './assets/title.png'

const HELP_DISMISSED_KEY = 'fractal-paint:help-dismissed'

const stage = useTemplateRef('stage')
const fractalCanvas = useTemplateRef('fractalCanvas')
const overlayCanvas = useTemplateRef('overlayCanvas')

const tool = ref<Tool>('draw')
const canDeleteFrame = ref(false)
const helpOpen = ref(!readFlag(HELP_DISMISSED_KEY))
const splash = ref(true)
const dropping = ref(false)

let app: FractalPaint | null = null

watch(tool, (value) => app?.setTool(value))
watch(helpOpen, (open) => {
  if (!open) writeFlag(HELP_DISMISSED_KEY)
})

onMounted(() => {
  app = new FractalPaint(stage.value!, fractalCanvas.value!, overlayCanvas.value!, {
    onSelectionChange: (selection) => (canDeleteFrame.value = selection.deletable),
  })

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('paste', onPaste)
})

onBeforeUnmount(() => {
  app?.destroy()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('paste', onPaste)
})

async function loadFile(file: File) {
  if (!file.type.startsWith('image/')) return
  try {
    app?.loadImage(await createImageBitmap(file))
    splash.value = false
  } catch (error) {
    console.error('Could not load image', error)
  }
}

function onKeyDown(e: KeyboardEvent) {
  splash.value = false
  if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest('input, textarea')) return

  const tools: Record<string, Tool> = { d: 'draw', e: 'erase', f: 'frames' }
  const key = e.key.toLowerCase()
  if (key in tools) tool.value = tools[key]
  else if (e.key === 'Delete' || e.key === 'Backspace') app?.deleteSelectedFrame()
}

function onPaste(e: ClipboardEvent) {
  const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
  if (file) {
    e.preventDefault()
    loadFile(file)
  }
}

function onDrop(e: DragEvent) {
  dropping.value = false
  const file = e.dataTransfer?.files[0]
  if (file) loadFile(file)
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Storage may be unavailable (e.g. private browsing); the flag just won't persist.
  }
}
</script>

<template>
  <main
    class="app"
    :class="{ dropping }"
    @pointerdown.capture="splash = false"
    @dragover.prevent="dropping = true"
    @dragleave.self="dropping = false"
    @drop.prevent="onDrop"
  >
    <div ref="stage" class="stage">
      <canvas ref="fractalCanvas" class="layer" />
      <canvas ref="overlayCanvas" class="layer input" />
    </div>

    <HelpPanel v-if="helpOpen" @close="helpOpen = false" />

    <Toolbar
      v-model:tool="tool"
      :can-delete-frame="canDeleteFrame"
      :help-open="helpOpen"
      @add-frame="app?.addFrame()"
      @delete-frame="app?.deleteSelectedFrame()"
      @shuffle-frames="app?.shuffleFrames()"
      @clear-drawing="app?.clearDrawing()"
      @load-file="loadFile"
      @toggle-help="helpOpen = !helpOpen"
    />

    <Transition name="fade">
      <div v-if="splash" class="splash" :style="{ backgroundImage: `url(${titleUrl})` }" @pointerdown="splash = false" />
    </Transition>
  </main>
</template>

<style scoped>
.app,
.stage,
.layer,
.splash {
  position: fixed;
  inset: 0;
}

.layer {
  width: 100%;
  height: 100%;
}

.input {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  cursor: crosshair;
}

.app.dropping .stage {
  outline: 4px dashed #4cc9f0;
  outline-offset: -12px;
}

.splash {
  z-index: 10;
  background: #000 no-repeat 50% 50% / contain;
  cursor: pointer;
}

.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-leave-to {
  opacity: 0;
}
</style>
