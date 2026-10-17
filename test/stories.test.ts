import { afterEach, describe, expect, it } from 'vitest'
import { collectStoryRoutes, parseStorySource } from '../src/modules/stories'
import { componentPage, file, makeRepo, resolvedConfig, type Repo } from './helpers'

describe('parseStorySource', () => {
  it('prefers the story comment name', () => {
    const story = parseStorySource(
      `import { vueStory } from '@nimtech/nimpress/story'\n// story: Card\nexport default vueStory({ name: "Other", props: { label: "x" } })\n`,
      'card.story.ts'
    )
    expect(story.name).toBe('Card')
    expect(story.props).toEqual({ label: 'x' })
  })

  it('falls back to the name field, then the file name', () => {
    expect(parseStorySource(`export default vueStory({ name: "Named" })`, 'x.story.ts').name).toBe('Named')
    expect(parseStorySource(`export default vueStory({})`, 'fallback.story.ts').name).toBe('fallback')
  })

  it('reads underscores in the file name as spaces', () => {
    expect(parseStorySource(`export default vueStory({})`, 'With_Controls.story.ts').name).toBe('With Controls')
    expect(parseStorySource(`export default vueStory({ name: "Kept_As_Is" })`, 'With_Controls.story.ts').name).toBe('Kept_As_Is')
  })

  it('parses description and slots', () => {
    const story = parseStorySource(
      `export default vueStory({ name: "S", description: 'Says hi', slots: { default: "<b>hi</b>" } })`,
      's.story.ts'
    )
    expect(story.description).toBe('Says hi')
    expect(story.slots).toEqual({ default: '<b>hi</b>' })
  })
})

describe('collectStoryRoutes', () => {
  let repo: Repo
  afterEach(() => repo?.cleanup())

  const config = (base = '/') =>
    resolvedConfig({
      base,
      modules: {
        dir: 'modules',
        route: '/_components',
        systems: {
          vue: { name: 'vue', framework: 'vue', source: './src' },
          svelte: { name: 'svelte', framework: 'svelte', source: './src/svelte' }
        }
      }
    })

  const seed = (): void => {
    repo = makeRepo()
    file(repo.cwd, 'docs/Vue/Button/index.md', componentPage('vue', 'Button'))
    file(repo.cwd, 'docs/Vue/Button/default.story.ts', `// story: Default\nexport default vueStory({})\n`)
    file(repo.cwd, 'docs/Vue/Button/with_icon.story.tsx', `export default vueStory({ description: 'An icon' })\n`)
    file(repo.cwd, 'docs/Svelte/Button/index.md', componentPage('svelte', 'Button'))
    file(repo.cwd, 'docs/Svelte/Button/default.story.ts', `export default svelteStory({})\n`)
    file(repo.cwd, 'docs/Vue/Card/index.md', componentPage('vue', 'Card'))
    file(repo.cwd, 'docs/Vue/Card/default.story.ts', `export default vueStory({})\n`)
    file(repo.cwd, 'docs/Other/Card/index.md', componentPage('unconfigured', 'Card'))
  }

  it('lists one component in every system that carries it, matched without case', async () => {
    seed()
    const routes = await collectStoryRoutes(repo.cwd, config(), { component: 'button' })
    expect(routes.map((r) => [r.system, r.story, r.route])).toEqual([
      ['svelte', 'default', '/_components/svelte/Button/?story=default'],
      ['vue', 'default', '/_components/vue/Button/?story=default'],
      ['vue', 'with_icon', '/_components/vue/Button/?story=with_icon']
    ])
    expect(routes[2]).toMatchObject({ name: 'with icon', description: 'An icon' })
  })

  it('narrows to one system and skips pages of an unconfigured system', async () => {
    seed()
    expect((await collectStoryRoutes(repo.cwd, config(), { component: 'Button', system: 'vue' })).map((r) => r.system)).toEqual(['vue', 'vue'])
    expect((await collectStoryRoutes(repo.cwd, config(), { component: 'Card' })).map((r) => r.system)).toEqual(['vue'])
  })

  it('prefixes the site base', async () => {
    seed()
    const [first] = await collectStoryRoutes(repo.cwd, config('/docs/'), { component: 'Card' })
    expect(first.route).toBe('/docs/_components/vue/Card/?story=default')
  })
})
