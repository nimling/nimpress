import { afterEach, describe, expect, it } from 'vitest'
import { filterSidebar } from '../src/framework/stores/dropdown'
import { lintContent } from '../src/plugin'
import { makeRepo, file, type Repo } from './helpers'
import type { SidebarNode } from '../src/types'

let repo: Repo

afterEach(() => repo?.cleanup())

const tree: SidebarNode[] = [
  {
    text: 'Mar',
    slug: 'Mar',
    items: [
      {
        text: 'MarButton',
        slug: 'Mar/MarButton',
        variants: true,
        items: [
          { text: 'Vue', link: '/Mar/MarButton/Vue', dropdown: { language: ['Vue'] }, items: [{ text: 'Overview', link: '/Mar/MarButton/Vue' }] },
          { text: 'Svelte', link: '/Mar/MarButton/Svelte', dropdown: { language: ['Svelte'] } }
        ]
      },
      { text: 'MarChart', link: '/Mar/MarChart', dropdown: { language: ['Vue'] } },
      { text: 'Styling', link: '/Mar/styling' }
    ]
  }
]

describe('filterSidebar', () => {
  it('keeps every node when nothing is selected', () => {
    expect(filterSidebar(tree, {})).toBe(tree)
  })

  it('drops pages outside the selection and keeps pages without a value', () => {
    const mar = filterSidebar(tree, { language: 'Svelte' })[0]
    expect(mar.items!.map((n) => n.text)).toEqual(['MarButton', 'Styling'])
  })

  it('folds a variant folder into the one page the selection leaves', () => {
    const button = filterSidebar(tree, { language: 'Vue' })[0].items![0]
    expect(button.text).toBe('MarButton')
    expect(button.link).toBe('/Mar/MarButton/Vue')
    expect(button.items!.map((n) => n.text)).toEqual(['Overview'])
  })
})

describe('dropdown frontmatter', () => {
  it('accepts a dropdown block with a value list', async () => {
    repo = makeRepo()
    file(
      repo.cwd,
      'docs/button.md',
      `---
title: Button
dropdown:
  language:
    title: Language
    description: The framework a component is written in
    value: [Vue, Svelte]
---

Body.
`
    )
    expect(await lintContent(repo.cwd, 'docs')).toEqual([])
  })

  it('rejects a value that is not a list', async () => {
    repo = makeRepo()
    file(
      repo.cwd,
      'docs/button.md',
      `---
title: Button
dropdown:
  language:
    value: Vue
---

Body.
`
    )
    expect((await lintContent(repo.cwd, 'docs')).length).toBe(1)
  })
})
