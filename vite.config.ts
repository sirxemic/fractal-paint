import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Relative base so the build works when served from a sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [vue()],
})
