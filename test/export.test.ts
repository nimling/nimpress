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
    const out = join(repo.cwd, '.nimpress')
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
    expect(existsSync(join(repo.cwd, '.nimpress', 'a'))).toBe(false)
  })

  it('exports a whole folder from its index and stamps the gate on the copies only', () => {
    repo = makeRepo()
    file(repo.cwd, 'package.json', '{"version":"0.3.0"}\n')
    file(repo.cwd, 'docs/index.md', '---\ntitle: Home\n---\n')
    file(repo.cwd, 'docs/components/index.md', '---\ntitle: Components\nexport:\n  target: samna\n  gate: components\ncollapsed: true\n---\n')
    file(repo.cwd, 'docs/components/harness-setup.ts', 'export default {}\n')
    file(repo.cwd, 'docs/components/Modals/index.md', '---\nsidebar:\n  name: Modals\n---\n')
    file(repo.cwd, 'docs/components/Modals/harness.vue', '<template />\n')
    file(repo.cwd, 'docs/components/Modals/MarDialog/index.md', '---\ntitle: MarDialog\ntype: component\ndata:\n  package: "@nimling/components-nimtech"\n---\n')
    file(repo.cwd, 'docs/components/Modals/MarDialog/default.story.ts', "import Harness from '../harness.vue'\n")
    file(repo.cwd, 'docs/components/Draft/index.md', '---\ntitle: Draft\nexport: false\n---\n')
    file(repo.cwd, 'docs/components/Draft/Inner/index.md', '---\ntitle: Inner\n---\n')
    file(repo.cwd, 'docs/components/Open/index.md', '---\ntitle: Open\ngate: internal\n---\n')
    runExport(repo.cwd, resolvedConfig(), ['--target=samna'])
    const out = join(repo.cwd, '.nimpress')
    const root = readFileSync(join(out, 'components/index.md'), 'utf-8')
    expect(root).not.toContain('export')
    expect(root).not.toContain('target:')
    expect(root).toContain('gate: components')
    expect(root).toContain('collapsed: true')
    const page = readFileSync(join(out, 'components/Modals/MarDialog/index.md'), 'utf-8')
    expect(page).toContain('gate: components')
    expect(page).toContain('version: "0.3.0"')
    expect(readFileSync(join(out, 'components/Open/index.md'), 'utf-8')).toContain('gate: internal')
    for (const rel of ['components/harness-setup.ts', 'components/Modals/harness.vue', 'components/Modals/MarDialog/default.story.ts']) {
      expect(existsSync(join(out, rel))).toBe(true)
    }
    for (const rel of ['index.md', 'components/Draft']) {
      expect(existsSync(join(out, rel))).toBe(false)
    }
    expect(readFileSync(join(repo.cwd, 'docs/components/Modals/MarDialog/index.md'), 'utf-8')).not.toContain('gate:')
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
