<script setup lang="ts">
import Icon from './Icon.vue'

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <aside class="help" aria-label="How to use">
    <button type="button" class="close" aria-label="Close help" @click="emit('close')">
      <Icon name="close" />
    </button>
    <p>
      Draw something, and watch it repeat itself inside the frames. The yellow frame is the reference: whatever is
      inside it gets copied into every white frame, over and over.
    </p>
    <h2>Touch</h2>
    <ul>
      <li>Draw or erase with one finger, pick the tool below.</li>
      <li>Pinch with two fingers to zoom and pan.</li>
      <li>In <b>Frames</b> mode, drag frames to move them and drag their corners to rotate and resize them. Double-tap to add or remove a frame.</li>
    </ul>
    <h2>Mouse</h2>
    <ul>
      <li>Draw with the left button, erase with the right button.</li>
      <li>Hold <kbd>Shift</kbd> (or use <b>Frames</b> mode) to move frames, drag their corners, and pan the scene. Scroll to zoom.</li>
      <li>Double-click to add or remove a frame.</li>
    </ul>
    <p>Load an image with the <b>Image</b> button, or drop or paste one onto the page.</p>
  </aside>
</template>

<style scoped>
.help {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top));
  left: calc(12px + env(safe-area-inset-left));
  width: min(360px, calc(100vw - 24px));
  max-height: calc(100dvh - 110px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  overflow-y: auto;
  padding: 14px 40px 14px 16px;
  border-radius: 14px;
  background: rgb(255 255 255 / 0.92);
  color: #111;
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.5);
  font-size: 13px;
}

h2 {
  margin: 10px 0 4px;
  font-size: 13px;
}

p + p,
ul + p {
  margin-top: 8px;
}

ul {
  padding-left: 18px;
}

li + li {
  margin-top: 3px;
}

kbd {
  padding: 0 4px;
  border: 1px solid #999;
  border-radius: 4px;
  font: inherit;
  font-size: 12px;
}

.close {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

@media (hover: hover) {
  .close:hover {
    background: rgb(0 0 0 / 0.08);
  }
}
</style>
