import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import nimpress from '../src/plugin'
import { makeRepo, file, type Repo } from './helpers'

let repo: Repo
let previousCwd: string

afterEach(() => {
  if (previousCwd) process.chdir(previousCwd)
  repo?.cleanup()
})

function changelogEntry(options: {
  pageTitle: string
  version: string
  date: string
  entryTitle: string
  description: string
  body: string
  subscribe?: boolean
  rss?: boolean
  gate?: string
}): string {
  const flags: string[] = []
  if (options.subscribe) flags.push('subscribe: true')
  if (options.rss) flags.push('rss: true')
  if (options.gate) flags.push(`gate: ${options.gate}`)
  return `---
title: ${options.pageTitle}
type: changelog
${flags.join('\n')}
data:
  version: ${options.version}
  release_date: ${options.date}
  title: ${options.entryTitle}
  description: ${options.description}
---

${options.body}
`
}

describe('subscribe map', () => {
  it('emits subscribe.map.json beside the feeds with entries and guarded feed paths', async () => {
    repo = makeRepo()
    previousCwd = process.cwd()
    file(
      repo.cwd,
      'nimpress.config.json',
      JSON.stringify({ title: 'X', contentDir: 'docs', site: { title: 'X', url: 'https://docs.example.com' } })
    )
    file(repo.cwd, 'docs/index.md', '---\ntitle: Home\n---\n\nHome.\n')
    file(
      repo.cwd,
      'docs/changelog/v1.1.0.md',
      changelogEntry({
        pageTitle: 'Changelog',
        version: '1.1.0',
        date: '2026-05-01',
        entryTitle: 'Faster search',
        description: 'Search results arrive twice as fast.',
        body: 'Search now streams results as they match.',
        subscribe: true
      })
    )
    file(
      repo.cwd,
      'docs/changelog/v1.2.0.md',
      changelogEntry({
        pageTitle: 'Changelog',
        version: '1.2.0',
        date: '2026-06-10',
        entryTitle: 'Booking calendars',
        description: 'Booking calendars become a first class resource.',
        body: 'Calendars can now be booked directly.\n\n## Details\n\nEach calendar carries its own availability.',
        subscribe: true
      })
    )
    file(
      repo.cwd,
      'docs/team/changelog/v0.1.0.md',
      changelogEntry({
        pageTitle: 'Team changelog',
        version: '0.1.0',
        date: '2026-04-02',
        entryTitle: 'Internal preview',
        description: 'The internal preview opens for the team.',
        body: 'The preview is live for internal accounts.',
        subscribe: true,
        gate: 'internal'
      })
    )
    file(
      repo.cwd,
      'docs/public/changelog/v2.0.0.md',
      changelogEntry({
        pageTitle: 'Public changelog',
        version: '2.0.0',
        date: '2026-03-15',
        entryTitle: 'Open beta',
        description: 'The open beta begins.',
        body: 'Everyone can sign up.',
        rss: true
      })
    )
    process.chdir(repo.cwd)
    const plugin = nimpress() as any
    await plugin.config()
    plugin.configResolved({ command: 'build', root: repo.cwd, build: { outDir: 'dist' } })
    await plugin.buildStart()
    file(repo.cwd, 'dist/index.html', '<!doctype html><html><head></head><body></body></html>')
    await plugin.closeBundle()

    expect(existsSync(join(repo.cwd, 'dist', 'changelog', 'rss.xml'))).toBe(true)
    const map = JSON.parse(readFileSync(join(repo.cwd, 'dist', 'subscribe.map.json'), 'utf-8'))
    expect(map.pages.map((p: { path: string }) => p.path)).toEqual(['/changelog', '/team/changelog'])

    const main = map.pages[0]
    expect(main.title).toBe('Changelog')
    expect(main.name).toBe('changelog')
    expect(main.feed).toBe('/changelog/rss.xml')
    expect(main.entries.map((e: { version: string }) => e.version)).toEqual(['1.2.0', '1.1.0'])
    expect(main.entries[0]).toMatchObject({
      slug: 'v1.2.0',
      version: '1.2.0',
      date: '2026-06-10T00:00:00.000Z',
      title: 'Booking calendars',
      description: 'Booking calendars become a first class resource.'
    })
    expect(main.entries[0].body).toContain('Calendars can now be booked directly.')
    expect(main.entries[0].body).toContain('## Details')
    expect(main.entries[1].body).toContain('Search now streams results as they match.')

    const gated = map.pages[1]
    expect(gated.title).toBe('Team changelog')
    expect(gated.name).toBe('team-changelog')
    expect(gated.feed).toBe('/_guarded/internal/team/changelog/rss.xml')
    expect(gated.entries).toHaveLength(1)
    expect(gated.entries[0].slug).toBe('v0.1.0')
  })

  it('leaves out subscribe pages that get no feed file written', async () => {
    repo = makeRepo()
    previousCwd = process.cwd()
    file(
      repo.cwd,
      'nimpress.config.json',
      JSON.stringify({ title: 'X', contentDir: 'docs', site: { title: 'X', url: 'https://docs.example.com' } })
    )
    file(repo.cwd, 'docs/index.md', '---\ntitle: Home\n---\n\nHome.\n')
    file(
      repo.cwd,
      'docs/changelog/v1.0.0.md',
      changelogEntry({
        pageTitle: 'Changelog',
        version: '1.0.0',
        date: '2026-05-01',
        entryTitle: 'First release',
        description: 'The first release ships.',
        body: 'Everything starts here.',
        subscribe: true
      })
    )
    file(repo.cwd, 'docs/guide.md', '---\ntitle: Guide\nsubscribe: true\n---\n\nA guide with no feed.\n')
    file(
      repo.cwd,
      'docs/empty/changelog/v0.0.1.md',
      `---
title: Empty changelog
type: changelog
subscribe: true
visibility: dev-only
data:
  version: 0.0.1
  release_date: 2026-02-01
  title: Hidden start
  description: The only entry is hidden.
---

Nothing visible here.
`
    )
    process.chdir(repo.cwd)
    const plugin = nimpress() as any
    await plugin.config()
    plugin.configResolved({ command: 'build', root: repo.cwd, build: { outDir: 'dist' } })
    await plugin.buildStart()
    file(repo.cwd, 'dist/index.html', '<!doctype html><html><head></head><body></body></html>')
    await plugin.closeBundle()

    const map = JSON.parse(readFileSync(join(repo.cwd, 'dist', 'subscribe.map.json'), 'utf-8'))
    const paths = map.pages.map((p: { path: string }) => p.path)
    expect(paths).toEqual(['/changelog'])
    expect(paths).not.toContain('/guide')
    expect(paths).not.toContain('/empty/changelog')
    expect(existsSync(join(repo.cwd, 'dist', 'guide', 'rss.xml'))).toBe(false)
    expect(existsSync(join(repo.cwd, 'dist', 'empty', 'changelog', 'rss.xml'))).toBe(false)
    for (const page of map.pages as Array<{ feed: string }>) {
      expect(existsSync(join(repo.cwd, 'dist', ...page.feed.slice(1).split('/')))).toBe(true)
    }
  })

  it('writes an empty pages list when nothing is subscribable', async () => {
    repo = makeRepo()
    previousCwd = process.cwd()
    file(
      repo.cwd,
      'nimpress.config.json',
      JSON.stringify({ title: 'X', contentDir: 'docs', site: { title: 'X', url: 'https://docs.example.com' } })
    )
    file(repo.cwd, 'docs/index.md', '---\ntitle: Home\n---\n\nHome.\n')
    process.chdir(repo.cwd)
    const plugin = nimpress() as any
    await plugin.config()
    plugin.configResolved({ command: 'build', root: repo.cwd, build: { outDir: 'dist' } })
    await plugin.buildStart()
    file(repo.cwd, 'dist/index.html', '<!doctype html><html><head></head><body></body></html>')
    await plugin.closeBundle()
    const map = JSON.parse(readFileSync(join(repo.cwd, 'dist', 'subscribe.map.json'), 'utf-8'))
    expect(map).toEqual({ pages: [] })
  })
})
