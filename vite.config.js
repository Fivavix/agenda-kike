import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const generateVersionPlugin = () => {
  return {
    name: 'generate-version',
    buildStart() {
      // Create a unique timestamp string
      const version = { version: Date.now().toString() };
      const publicDir = path.resolve(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
      }
      fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(version));
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generateVersionPlugin()],
  base: "/agenda-kike/"
});
