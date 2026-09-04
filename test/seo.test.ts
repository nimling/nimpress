import { describe, expect, it } from 'vitest'
import { seoDescription, seoGenerate, seoRobotsValue } from '../src/plugin'

describe('seo generation', () => {
  it('ranks the words of a page against the site and puts the tags first', () => {
    const generated = seoGenerate([
      { slug: 'a', title: 'Booking calendars', headings: ['Create a calendar'], tags: ['Bookable'], body: 'A calendar holds bookings for a room. Every calendar has bookings and a room.' },
      { slug: 'b', title: 'Sessions', headings: ['Login'], tags: [], body: 'A session arrives as a cookie. The login flow sets the cookie.' }
    ])
    const a = generated.get('a')!
    expect(a.keywords[0]).toBe('Bookable')
    expect(a.keywords).toContain('calendar')
    expect(a.keywords).not.toContain('session')
    expect(a.keywords.length).toBeLessThanOrEqual(8)
  })

  it('takes the description from the first real paragraph and caps it at 160 characters', () => {
    const body = '# Title\n\n:::tip\nSkip me\n:::\n\nThe first paragraph explains what the page covers in one or two sentences, and it is long enough to count as a description for search. ' + 'More words follow here. '.repeat(10)
    const description = seoDescription(body)
    expect(description.startsWith('The first paragraph')).toBe(true)
    expect(description.length).toBeLessThanOrEqual(160)
    expect(seoDescription('short')).toBe('')
  })

  it('adds the ai directives when the page or the site blocks crawlers', () => {
    expect(seoRobotsValue('index', undefined, undefined)).toBe('index')
    expect(seoRobotsValue('index', false, undefined)).toBe('index, noai, noimageai')
    expect(seoRobotsValue('index', false, true)).toBe('index')
    expect(seoRobotsValue('index', true, false)).toBe('index, noai, noimageai')
  })
})
