import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  traceDocsSites,
  traceReceiver,
  mergeSyncConfig,
  resolvedTargets,
  syncConfigFor,
  mirror,
  repoName,
  repoUrl,
  readGlobalConfig,
  writeGlobalConfig,
  globalConfigFile,
  sitesDir
} from '../src/cli/view'
import { makeRepo, file, type Repo } from './helpers'

let repo: Repo

afterEach(() => repo?.cleanup())

describe('traceDocsSites', () => {
  it('reads docs-repo and export-dir from the docs-notify step and resolves env references', () => {
    repo = makeRepo()
    file(
      repo.cwd,
      '.github/workflows/docs.yml',
      `name: Publish docs
on:
  push:
    tags: ['v*']
env:
  EXPORT_DIR: documentation
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: nimling/nimpress/actions/docs-notify@v2
        with:
          docs-repo: nimling/docs-site
          token: \${{ steps.app.outputs.token }}
          export-dir: \${{ env.EXPORT_DIR }}
`
    )
    expect(traceDocsSites(repo.cwd)).toEqual([{ repo: 'nimling/docs-site', exportDir: 'documentation' }])
  })

  it('defaults the export folder, keeps one link per docs site, and ignores repos without workflows', () => {
    repo = makeRepo()
    file(
      repo.cwd,
      '.github/workflows/a.yml',
      `jobs:
  a:
    steps:
      - uses: nimling/nimpress/actions/docs-notify@v2
        with:
          docs-repo: nimling/docs-site
  b:
    steps:
      - uses: nimling/nimpress/actions/docs-notify@v2
        with:
          docs-repo: nimling/docs-site
      - uses: nimling/nimpress/actions/docs-notify@v2
        with:
          docs-repo: nimling/other-site
`
    )
    expect(traceDocsSites(repo.cwd)).toEqual([
      { repo: 'nimling/docs-site', exportDir: '.nimpress' },
      { repo: 'nimling/other-site', exportDir: '.nimpress' }
    ])
    const bare = makeRepo()
    expect(traceDocsSites(bare.cwd)).toEqual([])
    bare.cleanup()
  })
})

describe('traceReceiver', () => {
  it('reads content-root, mapping, and defaults from the docs-sync step relative to the docs checkout', () => {
    repo = makeRepo()
    file(
      repo.cwd,
      '.github/workflows/docs-sync.yml',
      `jobs:
  sync:
    steps:
      - uses: actions/checkout@v4
        with:
          path: docs
      - uses: nimling/nimpress/actions/docs-sync@v2
        with:
          docs-dir: \${{ github.workspace }}/docs
          content-root: \${{ github.workspace }}/docs/content
          mapping: \${{ github.workspace }}/docs/nimpress.sources.json
          defaults: '{"target":"tools/x","publish":"auto"}'
`
    )
    expect(traceReceiver(repo.cwd, 'docs')).toEqual({
      contentRoot: 'content',
      mapping: 'nimpress.sources.json',
      defaults: { target: 'tools/x', publish: 'auto' }
    })
  })

  it('takes the site content folder and the mapping at the root when no receiver step exists', () => {
    repo = makeRepo()
    file(repo.cwd, 'nimpress.sources.json', '{"sources":{}}')
    expect(traceReceiver(repo.cwd, 'docs')).toEqual({ contentRoot: 'docs', mapping: 'nimpress.sources.json', defaults: {} })
  })
})

describe('sync config', () => {
  it('merges defaults with the source, the source winning per field', () => {
    const merged = mergeSyncConfig({ mode: 'mirror', target: 'tools/x' }, { target: 'solutions/x' })
    expect(merged).toEqual({ mode: 'mirror', target: 'solutions/x' })
  })

  it('resolves a single target and a targets list with the mode filled in', () => {
    expect(resolvedTargets({ target: 'tools/x' })).toEqual([{ from: '', to: 'tools/x', mode: 'mirror' }])
    expect(resolvedTargets({ mode: 'overlay', targets: [{ from: 'api', to: 'api/x', mode: '' }, { from: 'docs', to: 'solutions/x', mode: 'mirror' }] })).toEqual([
      { from: 'api', to: 'api/x', mode: 'overlay' },
      { from: 'docs', to: 'solutions/x', mode: 'mirror' }
    ])
    expect(resolvedTargets({})).toEqual([])
  })

  it('reads the source entry from the mapping file over the receiver defaults', () => {
    repo = makeRepo()
    file(repo.cwd, 'nimpress.sources.json', '{"sources":{"nimling/x":{"target":"solutions/x"}}}')
    const receiver = { contentRoot: 'docs', mapping: 'nimpress.sources.json', defaults: { target: 'tools/x', mode: 'mirror' } }
    expect(syncConfigFor(repo.cwd, receiver, 'nimling/x')).toEqual({ target: 'solutions/x', mode: 'mirror' })
    expect(syncConfigFor(repo.cwd, receiver, 'nimling/y')).toEqual({ target: 'tools/x', mode: 'mirror' })
  })
})

describe('mirror', () => {
  it('adds, updates, and in mirror mode removes files under the target', () => {
    repo = makeRepo()
    file(repo.cwd, 'src/index.md', 'one')
    file(repo.cwd, 'src/nested/page.md', 'two')
    file(repo.cwd, 'dest/index.md', 'old')
    file(repo.cwd, 'dest/gone.md', 'gone')
    const result = mirror(join(repo.cwd, 'src'), join(repo.cwd, 'dest'), 'mirror')
    expect(result).toEqual({ added: ['nested/page.md'], modified: ['index.md'], deleted: ['gone.md'] })
    expect(readFileSync(join(repo.cwd, 'dest/index.md'), 'utf-8')).toBe('one')
    expect(existsSync(join(repo.cwd, 'dest/gone.md'))).toBe(false)
    expect(mirror(join(repo.cwd, 'src'), join(repo.cwd, 'dest'), 'mirror')).toEqual({ added: [], modified: [], deleted: [] })
  })

  it('keeps files the source does not carry in overlay mode', () => {
    repo = makeRepo()
    file(repo.cwd, 'src/index.md', 'one')
    file(repo.cwd, 'dest/keep.md', 'keep')
    expect(mirror(join(repo.cwd, 'src'), join(repo.cwd, 'dest'), 'overlay')).toEqual({ added: ['index.md'], modified: [], deleted: [] })
    expect(existsSync(join(repo.cwd, 'dest/keep.md'))).toBe(true)
  })
})

describe('repo names', () => {
  it('reads owner/repo from short names and from http and ssh urls', () => {
    expect(repoName('nimling/docs-site')).toBe('nimling/docs-site')
    expect(repoName('https://github.com/nimling/docs-site.git')).toBe('nimling/docs-site')
    expect(repoName('git@github.com:nimling/docs-site.git')).toBe('nimling/docs-site')
    expect(() => repoName('docs-site')).toThrow('[nimpress] view: cannot read owner/repo')
  })

  it('turns a short name into an https url and keeps a url as given', () => {
    expect(repoUrl('nimling/docs-site')).toBe('https://github.com/nimling/docs-site.git')
    expect(repoUrl('git@github.com:nimling/docs-site.git')).toBe('git@github.com:nimling/docs-site.git')
  })
})

describe('global config', () => {
  it('lives under ~/.nimpress, reads empty when missing, and round trips the links', () => {
    repo = makeRepo()
    expect(globalConfigFile(repo.cwd)).toBe(join(repo.cwd, '.nimpress', 'config.json'))
    expect(sitesDir(repo.cwd)).toBe(join(repo.cwd, '.tide', 'nimpress', 'sites'))
    expect(readGlobalConfig(repo.cwd)).toEqual({ links: {} })
    const config = { links: { '/src/x': [{ repo: 'nimling/docs-site', url: 'https://github.com/nimling/docs-site.git', exportDir: '.nimpress', login: { method: 'gh' as const } }] } }
    writeGlobalConfig(config, repo.cwd)
    expect(readGlobalConfig(repo.cwd)).toEqual(config)
  })
})
