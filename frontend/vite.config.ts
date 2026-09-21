import path from 'node:path'

import vue from '@vitejs/plugin-vue'
import {defineConfig} from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
      '~wails': path.resolve(__dirname, 'wailsjs'),
    },
  },
  test: {
    environment: 'jsdom',
  },
})
