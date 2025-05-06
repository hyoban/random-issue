// @ts-check
import path from 'node:path'

import { defineConfig } from 'eslint-config-hyoban'

export default defineConfig(
  {},
  {
    settings: {
      tailwindcss: {
        config: path.join(import.meta.dirname, 'src/style.css'),
      },
    },
  },
)
