import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electronRenderer from 'vite-plugin-electron-renderer'

export default defineConfig({
    plugins: [
        react(),
        electronRenderer(),
    ],
    build: {
        rollupOptions: {
            input: 'index.html',
        },
    },
})
