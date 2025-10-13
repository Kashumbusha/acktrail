import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to replace environment variables in HTML
const htmlEnvPlugin = () => {
  return {
    name: 'html-env-replacement',
    transformIndexHtml(html) {
      return html.replace(/%(\w+)%/g, (match, p1) => {
        return process.env[p1] || match;
      });
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), htmlEnvPlugin()],
})
