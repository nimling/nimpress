import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateAutoStory, createComponentPage } from '../src/modules/autoStory'
import { importStorybook } from '../src/modules/importStorybook'
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

describe('default story generation', () => {
  it('writes default.story.tsx named Default for a storyless component', async () => {
    repo = makeRepo()
    file(repo.cwd, 'src/components/Foo/Foo.vue', fooVue)
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    const target = await generateAutoStory(repo.cwd, vueSystem(), 'sys', 'Foo')
    expect(target?.endsWith('default.story.tsx')).toBe(true)
    const raw = readFileSync(target!, 'utf-8')
    expect(raw).toContain('// story: Default')
    expect(raw).toContain('name: "Default"')
  })

  it('scaffolds a sourceless component with a default stub story', async () => {
    repo = makeRepo()
    const dir = await createComponentPage(repo.cwd, vueSystem(), 'sys', 'Bar')
    const raw = readFileSync(join(dir, 'default.story.tsx'), 'utf-8')
    expect(raw).toContain('name: "Default"')
  })
})

describe('importer default story conversion', () => {
  it('turns a mined story named as the component into the Default story', async () => {
    repo = makeRepo()
    file(repo.cwd, 'src/components/Foo/Foo.vue', fooVue)
    file(
      repo.cwd,
      'src/components/Foo/Foo.stories.ts',
      `const meta = { title: 'Components/Foo', component: Foo }
export const Foo = { args: { label: 'hi' } }
export const Small = { args: { label: 's' } }
`
    )
    await importStorybook(repo.cwd, vueSystem(), 'sys', {})
    const dir = join(repo.cwd, 'docs/components/Components/Foo')
    const def = readFileSync(join(dir, 'default.story.tsx'), 'utf-8')
    expect(def).toContain('name: "Default"')
    expect(def).toContain('"label": "hi"')
    expect(existsSync(join(dir, 'small.story.tsx'))).toBe(true)
  })
})
