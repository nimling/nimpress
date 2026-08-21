import { afterEach, describe, expect, it } from 'vitest'
import { loadNimpressConfig, runtimeConfig } from '../src/config/load'
import { joinBase, normalizeBase, stripBase } from '../src/config/base'
import { makeRepo, file, type Repo } from './helpers'

let repo: Repo

afterEach(() => repo?.cleanup())

describe('base', () => {
  it('normalizes every written form to one leading and one trailing slash', () => {
    expect(normalizeBase(undefined)).toBe('/')
    expect(normalizeBase('/')).toBe('/')
    expect(normalizeBase('nimpress')).toBe('/nimpress/')
    expect(normalizeBase('/nimpress')).toBe('/nimpress/')
    expect(normalizeBase('/nimpress/')).toBe('/nimpress/')
  })

  it('joins a root relative path once and leaves every other form alone', () => {
    expect(joinBase('/nimpress/', '/guide')).toBe('/nimpress/guide')
    expect(joinBase('/nimpress/', '/')).toBe('/nimpress/')
    expect(joinBase('/nimpress/', '/nimpress/guide')).toBe('/nimpress/guide')
    expect(joinBase('/nimpress/', './guide')).toBe('./guide')
    expect(joinBase('/nimpress/', '#anchor')).toBe('#anchor')
    expect(joinBase('/nimpress/', '//cdn.example.io/a.png')).toBe('//cdn.example.io/a.png')
    expect(joinBase('/', '/guide')).toBe('/guide')
  })

  it('strips the prefix back off a routed path', () => {
    expect(stripBase('/nimpress/', '/nimpress/guide')).toBe('/guide')
    expect(stripBase('/nimpress/', '/nimpress')).toBe('/')
    expect(stripBase('/nimpress/', '/guide')).toBe('/guide')
    expect(stripBase('/', '/guide')).toBe('/guide')
  })

  it('defaults to the site root and reaches the runtime config', async () => {
    repo = makeRepo()
    file(repo.cwd, 'nimpress.config.json', JSON.stringify({ title: 'X' }))
    const { resolved } = await loadNimpressConfig(repo.cwd)
    expect(resolved.base).toBe('/')
    expect(runtimeConfig(resolved).base).toBe('/')
  })

  it('normalizes a configured prefix', async () => {
    repo = makeRepo()
    file(repo.cwd, 'nimpress.config.json', JSON.stringify({ title: 'X', base: 'nimpress' }))
    const { resolved } = await loadNimpressConfig(repo.cwd)
    expect(resolved.base).toBe('/nimpress/')
    expect(runtimeConfig(resolved).base).toBe('/nimpress/')
  })
})
