import { describe, expect, it } from 'vitest'
import { parseStorySource } from '../src/modules/stories'

describe('parseStorySource', () => {
  it('prefers the story comment name', () => {
    const story = parseStorySource(
      `import { vueStory } from '@nimling/nimpress/story'\n// story: Card\nexport default vueStory({ name: "Other", props: { label: "x" } })\n`,
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
