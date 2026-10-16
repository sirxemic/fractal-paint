<script setup lang="ts">
import { watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW()

// The "ready to work offline" notice is informational only; hide it after a while.
watch(offlineReady, (ready) => {
  if (ready) setTimeout(() => (offlineReady.value = false), 4000)
})

function close() {
  needRefresh.value = false
  offlineReady.value = false
}
</script>

<template>
  <Transition name="toast">
    <div v-if="needRefresh || offlineReady" class="toast" role="status">
      <template v-if="needRefresh">
        <span>A new version is available.</span>
        <button type="button" class="primary" @click="updateServiceWorker(true)">Reload</button>
        <button type="button" @click="close">Later</button>
      </template>
      <template v-else>
        <span>Ready to work offline.</span>
        <button type="button" @click="close">OK</button>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 24px);
  padding: 8px 8px 8px 14px;
  border-radius: 12px;
  background: rgb(28 28 30 / 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.5);
  font-size: 13px;
}

span {
  flex: 1;
}

button {
  min-height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: rgb(255 255 255 / 0.12);
  cursor: pointer;
  touch-action: manipulation;
}

button.primary {
  background: #ffd60a;
  color: #000;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
