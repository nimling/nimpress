import type { ResolvedNimpressConfig, ResolvedPaths } from '../types'

export const defaultPaths: ResolvedPaths = {
  out: 'dist',
  cache: 'node_modules/.nimpress',
  export: '.nimpress',
  modules: '_components',
  guarded: '_guarded'
}

export const defaultConfig: ResolvedNimpressConfig = {
  title: 'Nimpress',
  status: { new: 'Recently added', deprecated: 'Deprecated' },
  tabs: { linked: false },
  images: { lightbox: false },
  math: true,
  base: '/',
  contentDir: 'docs',
  assetsDir: 'assets',
  assetUrlBase: '/assets',
  paths: defaultPaths,
  exclude: [],
  defaultFrontmatter: {},
  defaultFrontmatterExclude: [],
  banner: {},
  theme: 'stock',
  themes: [],
  components: {},
  css: [],
  vite: {},
  pageTypes: {},
  modules: {
    dir: 'modules',
    route: `/${defaultPaths.modules}`,
    systems: {}
  }
}

export const builtInThemes = ['stock', 'glass']

export const themeComponentNames = [
  'Header',
  'Announce',
  'Footer',
  'Sidebar',
  'SidebarNode',
  'Breadcrumbs',
  'RightToc',
  'BackToTop',
  'SearchModal',
  'AccountMenu',
  'ThemeMenu',
  'Feedback',
  'SubscribeDialog',
  'CodeBlock',
  'CodeGroup',
  'Tabs',
  'Actions',
  'Feature',
  'Lightbox',
  'MermaidBlock',
  'MathBlock',
  'DBMLBlock',
  'ComponentEmbed',
  'Card',
  'CardGroup',
  'Operation',
  'Schema',
  'ParamRow',
  'MethodBadge',
  'CodeExamples',
  'TryPanel',
  'TryDialog'
] as const

export function themeName(theme: string): string {
  return builtInThemes.includes(theme) ? theme : theme.replace(/^.*\//, '').replace(/\.css$/, '')
}
