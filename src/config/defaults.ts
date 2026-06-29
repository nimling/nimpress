import type { ResolvedNimpressConfig } from '../types'

export const defaultConfig: ResolvedNimpressConfig = {
  title: 'Nimpress',
  contentDir: 'docs',
  assetsDir: 'assets',
  assetUrlBase: '/assets',
  outDir: 'dist',
  exclude: [],
  defaultFrontmatter: {},
  defaultFrontmatterExclude: [],
  banner: {},
  css: [],
  vite: {}
}
