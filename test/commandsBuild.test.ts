import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build, type PluginOption } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import nimpress from '../src/plugin'
import { makeRepo, type Repo } from './helpers'

const fixture = resolve(__dirname, 'fixtures/commands')

let repo: Repo | null = null

afterEach(() => {
  repo?.cleanup()
  repo = null
  vi.restoreAllMocks()
})

async function getBundle(plugins: PluginOption[], alias: Record<string, string> = {}): Promise<string> {
  repo = makeRepo()
  vi.spyOn(process, 'cwd').mockReturnValue(fixture)
  await build({
    root: fixture,
    configFile: false,
    logLevel: 'silent',
    plugins: [svelte({ compilerOptions: { runes: true, dev: false } }), ...plugins],
    resolve: { alias },
    build: { outDir: repo.cwd, emptyOutDir: true, rollupOptions: { input: join(fixture, 'index.html') } }
  })
  const assets = join(repo.cwd, 'assets')
  return readdirSync(assets)
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFileSync(join(assets, name), 'utf-8'))
    .join('\n')
}

describe('commands in a static build', () => {
  it('leaves the client and the guarded command ui out of the bundle', async () => {
    const bundle = await getBundle([nimpress({ contentDir: 'docs' })])
    expect(bundle).not.toContain('/__nimpress/command')
    expect(bundle).not.toContain('TextDecoderStream')
    expect(bundle).not.toContain('Run git status')
    expect(bundle).not.toContain('a static build has no command server')
  }, 60_000)

  it('ships the client when the module is not swapped', async () => {
    const bundle = await getBundle([], { '@nimtech/nimpress/commands': resolve(__dirname, '../src/commands/index.ts') })
    expect(bundle).toContain('/__nimpress/command')
    expect(bundle).toContain('Run git status')
  }, 60_000)
})
