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
  contentDir: 'docs',
  assetsDir: 'assets',
  assetUrlBase: '/assets',
  paths: defaultPaths,
  exclude: [],
  defaultFrontmatter: {},
  defaultFrontmatterExclude: [],
  banner: {},
  css: [],
  vite: {},
  modules: {
    dir: 'modules',
    route: `/${defaultPaths.modules}`,
    systems: {}
  }
}
