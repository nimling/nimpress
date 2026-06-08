declare module 'markdown-it-deflist' {
  import type { PluginSimple } from 'markdown-it'
  const plugin: PluginSimple
  export default plugin
}

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'
  interface Options {
    enabled?: boolean
    label?: boolean
    labelAfter?: boolean
  }
  const plugin: (md: MarkdownIt, options?: Options) => void
  export default plugin
}
