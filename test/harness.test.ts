import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'vite'
import { harnessEntryId, harnessViteConfig } from '../src/modules/harness'
import { componentPage, file, makeRepo, resolvedConfig, type Repo } from './helpers'

describe('harnessViteConfig', () => {
  let repo: Repo
  afterEach(() => repo?.cleanup())

  const config = (vite: Record<string, unknown>) =>
    resolvedConfig({
      vite,
      modules: {
        dir: 'modules',
        route: '/_components',
        systems: { vue: { name: 'vue', framework: 'vue', source: './src' } }
      }
    })

  const seed = (): void => {
    repo = makeRepo()
    file(repo.cwd, 'package.json', '{}')
    file(repo.cwd, 'node_modules/@vitejs/plugin-vue/package.json', '{"name":"@vitejs/plugin-vue","main":"index.js"}')
    file(repo.cwd, 'node_modules/@vitejs/plugin-vue/index.js', `module.exports = () => ({ name: 'vue' })\n`)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  }

  it('keeps the compiler build of vue beside a consumer alias array', async () => {
    seed()
    const consumer = [{ find: '@', replacement: '/src' }]
    const vite = await harnessViteConfig(repo.cwd, config({ resolve: { alias: consumer } }), 'vue', 'serve')
    expect(vite.resolve?.alias).toEqual([{ find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' }, ...consumer])
  })

  it('keeps the compiler build of vue beside a consumer alias object', async () => {
    seed()
    const vite = await harnessViteConfig(repo.cwd, config({ resolve: { alias: { '@': '/src' } } }), 'vue', 'build')
    expect(vite.resolve?.alias).toEqual([
      { find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' },
      { find: '@', replacement: '/src' }
    ])
  })

  it('registers a story file and a component page added while the server runs', async () => {
    seed()
    file(repo.cwd, 'src/Button/Button.vue', '<template><b /></template>\n')
    file(repo.cwd, 'docs/Vue/Button/index.md', componentPage('vue', 'Button'))
    file(repo.cwd, 'docs/Vue/Button/default.story.ts', 'export default {}\n')
    const server = await createServer({ ...(await harnessViteConfig(repo.cwd, config({}), 'vue', 'serve')), logLevel: 'silent' })
    const entry = async (component: string) => {
      const loaded = await server.pluginContainer.load('\0' + harnessEntryId('vue', component))
      return typeof loaded === 'string' ? loaded : (loaded?.code ?? null)
    }
    try {
      expect(await entry('Button')).not.toContain('"waving"')
      server.watcher.emit('add', file(repo.cwd, 'docs/Vue/Button/waving.story.ts', 'export default {}\n'))
      await vi.waitFor(async () => expect(await entry('Button')).toContain('"waving"'))
      expect(await entry('Card')).toBeNull()
      file(repo.cwd, 'src/Card/Card.vue', '<template><i /></template>\n')
      file(repo.cwd, 'docs/Vue/Card/default.story.ts', 'export default {}\n')
      server.watcher.emit('add', file(repo.cwd, 'docs/Vue/Card/index.md', componentPage('vue', 'Card')))
      await vi.waitFor(async () => expect(await entry('Card')).toContain('"default"'))
    } finally {
      await server.close()
    }
  })
})
