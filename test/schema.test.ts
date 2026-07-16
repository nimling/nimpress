import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { upgradeComponentSchema, resolveComponentTarget } from '../src/modules/schema'
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
defineProps<{ label: string; count?: number }>()
</script>
<template><div>{{ label }}</div></template>
`

describe('upgradeComponentSchema', () => {
  it('regenerates schema.json from a unique component name', async () => {
    repo = makeRepo()
    file(repo.cwd, 'src/components/Foo/Foo.vue', fooVue)
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    const written = await upgradeComponentSchema(repo.cwd, vueSystem(), 'Foo')
    expect(written).toBe('docs/components/Components/Foo/schema.json')
    const schema = JSON.parse(readFileSync(join(repo.cwd, written), 'utf-8'))
    expect(schema.properties.label.type).toBe('string')
    expect(schema.properties.count.type).toBe('number')
    expect(schema.required).toContain('label')
    expect(schema.required).not.toContain('count')
  })

  it('includes defineModel props in the schema', async () => {
    repo = makeRepo()
    file(
      repo.cwd,
      'src/components/Foo/Foo.vue',
      `<script setup lang="ts">
defineProps<{ label: string }>()
const value = defineModel<string>()
const page = defineModel<number>('page')
</script>
<template><div>{{ label }}</div></template>
`
    )
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    const written = await upgradeComponentSchema(repo.cwd, vueSystem(), 'Foo')
    const schema = JSON.parse(readFileSync(join(repo.cwd, written), 'utf-8'))
    expect(schema.properties.modelValue.type).toBe('string')
    expect(schema.properties.page.type).toBe('number')
  })

  it('regenerates schema.json from a component file path', async () => {
    repo = makeRepo()
    file(repo.cwd, 'src/components/Foo/Foo.vue', fooVue)
    file(repo.cwd, 'docs/components/Components/Foo/index.md', componentPage('sys', 'Foo'))
    const written = await upgradeComponentSchema(repo.cwd, vueSystem(), 'src/components/Foo/Foo.vue')
    expect(written).toBe('docs/components/Components/Foo/schema.json')
  })

  it('rejects a component with no page', async () => {
    repo = makeRepo()
    file(repo.cwd, 'src/components/Foo/Foo.vue', fooVue)
    await expect(upgradeComponentSchema(repo.cwd, vueSystem(), 'Foo')).rejects.toThrow('no component page')
  })

  it('rejects a file outside every system source', async () => {
    repo = makeRepo()
    file(repo.cwd, 'other/Foo.vue', fooVue)
    await expect(resolveComponentTarget(repo.cwd, vueSystem(), 'other/Foo.vue')).rejects.toThrow(
      'no configured system source'
    )
  })
})
