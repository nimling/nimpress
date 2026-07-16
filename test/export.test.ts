import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runExport, rewriteExportedPage } from '../src/cli/export'
import { makeRepo, file, resolvedConfig, type Repo } from './helpers'

let repo: Repo

afterEach(() => repo?.cleanup())

describe('runExport', () => {
  it('collects marked pages, strips the export header, and stamps the package version', () => {
    repo = makeRepo()
    file(repo.cwd, 'package.json', '{"version":"1.2.3"}\n')
    file(
      repo.cwd,
      'docs/components/Components/Foo/index.md',
      `---
title: Foo
type: component
export: central
data:
  system: sys
  component: Foo
  package: "@nimling/components-test"
---

## Usage
`
    )
    file(repo.cwd, 'docs/components/Components/Foo/foo.story.ts', 'export default {}\n')
    file(repo.cwd, 'docs/guide/unmarked.md', '---\ntitle: Guide\n---\n\nBody\n')
    runExport(repo.cwd, resolvedConfig(), ['--target=central'])
    const out = join(repo.cwd, '.nimpress-export')
    const page = readFileSync(join(out, 'components/Components/Foo/index.md'), 'utf-8')
    expect(page).not.toContain('export:')
    expect(page).toContain('version: "1.2.3"')
    expect(existsSync(join(out, 'components/Components/Foo/foo.story.ts'))).toBe(true)
    expect(existsSync(join(out, 'guide'))).toBe(false)
  })

  it('skips pages marked for another target', () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/a/index.md', '---\ntitle: A\nexport: other\n---\n\nBody\n')
    runExport(repo.cwd, resolvedConfig(), ['--target=central'])
    expect(existsSync(join(repo.cwd, '.nimpress-export', 'a'))).toBe(false)
  })
})

describe('rewriteExportedPage', () => {
  it('drops export and file lines and leaves the body alone', () => {
    const text = `---
title: Foo
export: central
data:
  package: "@x/y"
  file: "Sub/Foo.vue"
---

Body
`
    const out = rewriteExportedPage(text, '2.0.0')
    expect(out).not.toContain('export:')
    expect(out).not.toContain('file:')
    expect(out).toContain('version: "2.0.0"')
    expect(out).toContain('Body')
  })
})
