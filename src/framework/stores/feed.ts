import { writable } from 'svelte/store'

export type PageFeed = {
  title: string
  feedPath: string
  emailEnabled: boolean
}

export const pageFeed = writable<PageFeed | null>(null)

export function setPageFeed(feed: PageFeed | null) {
  pageFeed.set(feed)
}
