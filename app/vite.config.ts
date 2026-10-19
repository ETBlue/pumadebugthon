import { existsSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/pumadebugthon/',
  define: {
    // "1" when public/data/cross-issue.json exists at build time (design
    // 3.18). Without it, the app does not ask for the file, so the browser
    // console shows no 404. CI builds the data before the app. In dev, restart
    // the server after the file appears or goes away.
    'import.meta.env.VITE_CROSS_ISSUE': JSON.stringify(
      existsSync(fileURLToPath(new URL('./public/data/cross-issue.json', import.meta.url))) ? '1' : '',
    ),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
