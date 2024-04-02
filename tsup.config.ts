import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/api.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  clean: true,
  dts: true,
  plugins: [
    {
      name: 'chmodx',
      renderChunk(_code, info) {
        if (info.path.endsWith('cli.js')) {
          info.mode = 0o755
        }
      },
    },
  ],
})
