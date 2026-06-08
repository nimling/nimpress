import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import dts from 'vite-plugin-dts'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const isLibrary = mode === 'library'

  return {
    plugins: [
      svelte({
        compilerOptions: {
          runes: true,
          dev: mode === 'development'
        }
      }),
      ...(isLibrary
        ? [
            dts({
              root: path.resolve(dirname),
              outDir: path.resolve(dirname, 'dist'),
              tsconfigPath: path.resolve(dirname, 'tsconfig.app.json'),
              exclude: [
                'src/**/*.test.ts',
                'vite.config.ts',
                'src/plugin.ts'
              ]
            })
          ]
        : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(dirname, 'src')
      }
    },
    ...(isLibrary && {
      build: {
        lib: {
          entry: {
            index: path.resolve(dirname, 'src/index.ts'),
            plugin: path.resolve(dirname, 'src/plugin.ts'),
            'tailwind.preset': path.resolve(dirname, 'tailwind.preset.ts')
          },
          formats: ['es'],
          fileName: (_format, entry) => `${entry === 'index' ? 'nimpress' : entry}.es.js`,
          cssFileName: 'style'
        },
        rollupOptions: {
          external: (id) => {
            if (id.startsWith('.') || id.startsWith('/')) return false
            if (id === 'svelte' || id.startsWith('svelte/')) return true
            const externals = [
              'markdown-it',
              'markdown-it-anchor',
              'markdown-it-attrs',
              'markdown-it-container',
              'markdown-it-footnote',
              'markdown-it-task-lists',
              'gray-matter',
              'shiki',
              'minisearch',
              'mermaid',
              'path-to-regexp',
              'zod',
              '@nimling/samna-auth-middleware',
              'codemirror',
              '@codemirror/state',
              '@codemirror/view',
              '@codemirror/commands',
              '@codemirror/lang-json',
              '@codemirror/theme-one-dark',
              'node:fs',
              'node:path',
              'node:url',
              'fs',
              'path',
              'url',
              'fs/promises'
            ]
            return externals.includes(id) || id.startsWith('node:')
          }
        },
        cssCodeSplit: false,
        target: 'es2022'
      }
    })
  }
})
