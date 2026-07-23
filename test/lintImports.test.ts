import { afterEach, describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lintImports, viteAliases } from '../src/cli/lint'
import { makeRepo, file, resolvedConfig, type Repo } from './helpers'

let repo: Repo

afterEach(() => repo?.cleanup())

describe('lintImports', () => {
  it('reports unresolved relative imports', () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Group/Comp/broken.story.ts', `import { seed } from "./missing"\nexport default seed\n`)
    const problems = lintImports(repo.cwd, resolvedConfig())
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('unresolved import ./missing')
  })

  it('accepts imports that resolve with known extensions', () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Group/Comp/data.ts', 'export const seed = 1\n')
    file(repo.cwd, 'docs/components/Group/Comp/ok.story.ts', `import { seed } from "./data"\nexport default seed\n`)
    file(repo.cwd, 'docs/components/Group/harness.vue', '<template><slot /></template>\n')
    file(repo.cwd, 'docs/components/Group/Comp/harnessed.story.ts', `import H from "../harness.vue"\nexport default H\n`)
    expect(lintImports(repo.cwd, resolvedConfig())).toHaveLength(0)
  })

  it('rejects shared fixture folder imports even when they resolve', () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/_shared/seed.ts', 'export const seed = 1\n')
    file(repo.cwd, 'docs/components/Group/Comp/bad.story.ts', `import { seed } from "../../_shared/seed"\nexport default seed\n`)
    const problems = lintImports(repo.cwd, resolvedConfig())
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('shared fixture folders are forbidden')
  })

  it('resolves alias imports through the consumer vite config', () => {
    repo = makeRepo()
    file(repo.cwd, 'src/components/Foo/index.ts', 'export default 1\n')
    file(repo.cwd, 'docs/components/Group/Comp/aliased.story.ts', `import Foo from "@/components/Foo"\nimport Bar from "@/components/Bar"\nexport default { Foo, Bar }\n`)
    const resolved = resolvedConfig({ vite: { resolve: { alias: { '@': join(repo.cwd, 'src') } } } })
    const problems = lintImports(repo.cwd, resolved)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('@/components/Bar')
  })

  it('resolves raw asset imports by stripping the query suffix', () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Group/Comp/template/cv.html', '<div></div>\n')
    file(repo.cwd, 'docs/components/Group/Comp/raw.story.ts', `import cv from "./template/cv.html?raw"\nimport missing from "./template/other.css?raw"\nexport default { cv, missing }\n`)
    const problems = lintImports(repo.cwd, resolvedConfig())
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('./template/other.css?raw')
  })

  it('ignores package imports', () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Group/Comp/pkg.story.ts', `import { vueStory } from '@nimling/nimpress/story'\nexport default vueStory({ name: 'X' })\n`)
    expect(lintImports(repo.cwd, resolvedConfig())).toHaveLength(0)
  })
})

describe('viteAliases', () => {
  it('reads object and array alias shapes', () => {
    expect(viteAliases({ resolve: { alias: { '@': '/x' } } })).toEqual([{ find: '@', replacement: '/x' }])
    expect(viteAliases({ resolve: { alias: [{ find: '@', replacement: '/x' }] } })).toEqual([
      { find: '@', replacement: '/x' }
    ])
    expect(viteAliases({})).toEqual([])
  })
})
