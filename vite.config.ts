import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Serves your existing `/assets` folder at URL root (e.g. `/pittsburgh-night-view.jpg`).
export default defineConfig({
  plugins: [react()],
  publicDir: 'assets',
})
