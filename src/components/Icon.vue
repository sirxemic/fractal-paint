<script setup lang="ts">
const paths = {
  draw: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
  erase: [
    'm7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21',
    'M22 21H7',
    'm5 11 9 9',
  ],
  frames: ['M4 4h11v11H4z', 'M17 10.5 21.5 15 17 19.5 12.5 15z'],
  add: ['M12 5v14', 'M5 12h14'],
  delete: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  ],
  shuffle: [
    'M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22',
    'm18 2 4 4-4 4',
    'M2 6h1.9c1.5 0 2.9.9 3.6 2.2',
    'M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8',
    'm18 14 4 4-4 4',
  ],
  image: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M9 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z', 'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21'],
  clear: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'm15 9-6 6', 'm9 9 6 6'],
  help: ['M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z', 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
} satisfies Record<string, string[]>

export type IconName = keyof typeof paths

defineProps<{ name: IconName }>()
</script>

<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="d in paths[name]" :key="d" :d="d" />
  </svg>
</template>

<style scoped>
.icon {
  width: 22px;
  height: 22px;
  flex: none;
}
</style>
