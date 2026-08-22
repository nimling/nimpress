import { afterEach, describe, expect, it } from 'vitest'
import { lintContent } from '../src/plugin'
import { makeRepo, file, type Repo } from './helpers'

let repo: Repo

afterEach(() => repo?.cleanup())

describe('sidebar link pages', () => {
  it('accepts a bodyless page carrying an absolute link', async () => {
    repo = makeRepo()
    file(
      repo.cwd,
      'docs/samna.md',
      `---
title: Samna docs
link: https://developer.samna.io
order: 90
---
`
    )
    expect(await lintContent(repo.cwd, 'docs')).toEqual([])
  })

  it('rejects a link that is not an absolute url', async () => {
    repo = makeRepo()
    file(
      repo.cwd,
      'docs/samna.md',
      `---
title: Samna docs
link: /guide
---
`
    )
    const problems = await lintContent(repo.cwd, 'docs')
    expect(problems).toEqual(['samna.md: link: must be an absolute url'])
  })

  it('rejects a link page that also carries a body', async () => {
    repo = makeRepo()
    file(
      repo.cwd,
      'docs/samna.md',
      `---
title: Samna docs
link: https://developer.samna.io
---

## Not rendered
`
    )
    const problems = await lintContent(repo.cwd, 'docs')
    expect(problems).toEqual([
      'samna.md: a link page carries no body, the entry opens link instead of a page'
    ])
  })

  it('rejects a link page with no label', async () => {
    repo = makeRepo()
    file(
      repo.cwd,
      'docs/samna.md',
      `---
link: https://developer.samna.io
---
`
    )
    const problems = await lintContent(repo.cwd, 'docs')
    expect(problems).toContain('samna.md: a link page needs a title or a sidebar.name for its label')
  })
})
