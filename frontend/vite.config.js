import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em desenvolvimento (npm run dev), as chamadas /api e /uploads
// são encaminhadas para o backend rodando na porta 3010.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3010',
      '/uploads': 'http://localhost:3010',
    },
  },
})
