import { afterEach, describe, expect, it } from 'vitest'
import { loadNimpressConfig } from '../src/config/load'
import { cacheDir, guardedRoute, modulesRoute, outDir } from '../src/config/paths'
import { makeRepo, file, type Repo } from './helpers'

let repo: Repo

afterEach(() => repo?.cleanup())

describe('paths config', () => {
  it('defaults every folder and derives the module route from paths.modules', async () => {
    repo = makeRepo()
    file(repo.cwd, 'nimpress.config.json', JSON.stringify({ title: 'X' }))
    const { resolved } = await loadNimpressConfig(repo.cwd)
    expect(resolved.paths).toEqual({
      out: 'dist',
      cache: 'node_modules/.nimpress',
      export: '.nimpress',
      modules: '_components',
      guarded: '_guarded'
    })
    expect(resolved.modules.route).toBe('/_components')
    expect(modulesRoute(resolved)).toBe('/_components')
    expect(guardedRoute(resolved)).toBe('/_guarded')
  })

  it('takes a partial paths override and layers the cache beneath one root', async () => {
    repo = makeRepo()
    file(repo.cwd, 'nimpress.config.json', JSON.stringify({ title: 'X', paths: { out: 'build', modules: 'widgets' } }))
    const { resolved } = await loadNimpressConfig(repo.cwd)
    expect(resolved.paths.out).toBe('build')
    expect(resolved.paths.modules).toBe('widgets')
    expect(resolved.paths.cache).toBe('node_modules/.nimpress')
    expect(resolved.modules.route).toBe('/widgets')
    expect(outDir(repo.cwd, resolved)).toBe(`${repo.cwd}/build`)
    expect(cacheDir(repo.cwd, resolved, 'lint')).toBe(`${repo.cwd}/node_modules/.nimpress/lint`)
    expect(cacheDir(repo.cwd, resolved, 'modules', 'nimtech')).toBe(`${repo.cwd}/node_modules/.nimpress/modules/nimtech`)
  })
})
