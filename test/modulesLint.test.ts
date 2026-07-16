import { afterEach, describe, expect, it } from 'vitest'
import { lintModules } from '../src/modules/lint'
import { upgradeComponentSchema } from '../src/modules/schema'
import { makeRepo, file, resolvedConfig, componentPage, type Repo } from './helpers'
import type { ResolvedNimpressConfig } from '../src/types'

let repo: Repo

afterEach(() => repo?.cleanup())

function vueSystem(): ResolvedNimpressConfig {
  return resolvedConfig({
    modules: {
      dir: 'modules',
      route: '/_components',
      systems: {
        sys: { name: 'sys', framework: 'vue', source: './src/components' }
      }
    }
  })
}

const fooVue = `<script setup lang="ts">
defineProps<{ label: string }>()
</script>
<template><div>{{ label }}</div></template>
`

describe('lintModules', () => {
  it('flags a missing schema.json', async () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    const problems = await lintModules(repo.cwd, vueSystem())
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('schema.json missing')
    expect(problems[0]).toContain('--component=Foo --schema')
  })

  it('flags the wrong story helper inside a system', async () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    file(repo.cwd, 'docs/components/Components/Foo/schema.json', '{"title":"Foo","type":"object","properties":{}}\n')
    file(
      repo.cwd,
      'docs/components/Components/Foo/foo.story.ts',
      `import { svelteStory } from '@nimling/nimpress/story'\nexport default svelteStory({ name: 'Foo' })\n`
    )
    const problems = await lintModules(repo.cwd, vueSystem())
    expect(problems.some((p) => p.includes('uses svelteStory inside the vue system sys'))).toBe(true)
  })

  it('flags foreign framework imports in stories', async () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    file(repo.cwd, 'docs/components/Components/Foo/schema.json', '{"title":"Foo","type":"object","properties":{}}\n')
    file(
      repo.cwd,
      'docs/components/Components/Foo/foo.story.ts',
      `import { vueStory } from '@nimling/nimpress/story'\nimport Widget from './Widget.svelte'\nexport default vueStory({ name: 'Foo', harness: Widget })\n`
    )
    const problems = await lintModules(repo.cwd, vueSystem())
    expect(problems.some((p) => p.includes('imports ./Widget.svelte inside the vue system sys'))).toBe(true)
  })

  it('flags story props absent from schema.json', async () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    file(
      repo.cwd,
      'docs/components/Components/Foo/schema.json',
      '{"title":"Foo","type":"object","properties":{"label":{"type":"string"}}}\n'
    )
    file(
      repo.cwd,
      'docs/components/Components/Foo/foo.story.ts',
      `import { vueStory } from '@nimling/nimpress/story'\nexport default vueStory({ name: 'Foo', props: { label: 'x', bogus: 1 } })\n`
    )
    const problems = await lintModules(repo.cwd, vueSystem())
    expect(problems.some((p) => p.includes('prop bogus is absent from schema.json'))).toBe(true)
    expect(problems.some((p) => p.includes('prop label'))).toBe(false)
  })

  it('exempts harness stories from the schema prop check', async () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    file(repo.cwd, 'docs/components/Components/Foo/schema.json', '{"title":"Foo","type":"object","properties":{}}\n')
    file(repo.cwd, 'docs/components/Components/harness.vue', '<template><slot /></template>\n')
    file(
      repo.cwd,
      'docs/components/Components/Foo/foo.story.ts',
      `import { vueStory } from '@nimling/nimpress/story'\nimport H from "../harness.vue"\nexport default vueStory({ name: 'Foo', harness: H, props: { modelValue: 'x' } })\n`
    )
    const problems = await lintModules(repo.cwd, vueSystem())
    expect(problems).toHaveLength(0)
  })

  it('flags schema.json drift against the component source and passes once regenerated', async () => {
    repo = makeRepo()
    const resolved = vueSystem()
    file(repo.cwd, 'src/components/Foo/Foo.vue', fooVue)
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    file(repo.cwd, 'docs/components/Components/Foo/schema.json', '{"title":"Foo","type":"object","properties":{}}\n')
    const before = await lintModules(repo.cwd, resolved)
    expect(before.some((p) => p.includes('out of date'))).toBe(true)
    await upgradeComponentSchema(repo.cwd, resolved, 'Foo')
    const after = await lintModules(repo.cwd, resolved)
    expect(after).toHaveLength(0)
  })
})
