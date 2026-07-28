import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { CONFIG } from './src/config'

// `base` is written in exactly one place: CONFIG.BASE.
export default defineConfig({
  base: CONFIG.BASE,
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
  },
})
