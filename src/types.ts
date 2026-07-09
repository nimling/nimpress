export type PageType =
  | 'doc'
  | 'openapi'
  | 'changelog'
  | 'hero'
  | 'roadmap'
  | 'milestone'
  | 'epic'
  | 'feature'
  | 'bug'
  | 'component'

export type ModuleFramework = 'vue' | 'svelte'

export interface ModuleSystemConfig {
  framework: ModuleFramework
  source?: string
  package?: string
  version?: string
  css?: string[]
  port?: number
  scope?: string
  claim?: string
  devOnly?: boolean
}

export interface ModulesConfig {
  dir: string
  route: string
  systems: Record<string, ModuleSystemConfig>
}

export type ControlKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json'
  | 'slot'

export interface ControlSpec {
  name: string
  kind: ControlKind
  type: string
  default?: unknown
  options?: string[]
  required?: boolean
}

export interface ControlSchema {
  component: string
  props: ControlSpec[]
  slots: ControlSpec[]
  emits: string[]
}

export interface ComponentStory {
  name: string
  file: string
  description?: string
  props?: Record<string, unknown>
  slots?: Record<string, string>
}

export interface ComponentPageData {
  system: string
  component: string
  package?: string
  version?: string
  claudeMd?: string
  claudeMdPath?: string
  editable?: boolean
  harnessPath: string
  schema?: ControlSchema
  stories: ComponentStory[]
}

export type RoadmapKind = 'milestone' | 'epic' | 'feature' | 'bug'

export type RoadmapStatus = 'shipped' | 'in_progress' | 'planned'

export interface RoadmapChangelogRef {
  version: string
  title: string
  description?: string
  releaseDate?: string
  progress?: number
  completes: boolean
  path: string
  slug: string
  entrySlug: string
}

export interface RoadmapEntry {
  kind: RoadmapKind
  slug: string
  filePath: string
  href: string
  title: string
  description?: string
  targetDate?: string
  parent?: string
  progress?: number
  status: RoadmapStatus
  hidden?: boolean
  html: string
  headings: Heading[]
  data?: Record<string, unknown>
  changelog: RoadmapChangelogRef[]
}

export interface OpenGraphMeta {
  title?: string
  description?: string
  type?: string
  image?: string
  imageAlt?: string
  url?: string
  siteName?: string
  locale?: string
}

export interface TwitterMeta {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player'
  site?: string
  creator?: string
  title?: string
  description?: string
  image?: string
  imageAlt?: string
}

export interface PageMetaTags {
  description?: string
  canonical?: string
  robots?: string
  keywords?: string | string[]
  author?: string
  themeColor?: string
  og?: OpenGraphMeta
  twitter?: TwitterMeta
  jsonLd?: unknown
}

export interface Frontmatter {
  title: string
  slug?: string
  type?: PageType
  path?: string
  spec?: string
  scope?: string
  claim?: string
  description?: string
  order?: number
  icon?: string
  hidden?: boolean
  lastUpdated?: boolean
  redirect?: string
  noToc?: boolean
  collapsed?: boolean
  footer?: string
  background?: string
  tags?: string | string[]
  rss?: boolean
  subscribe?: boolean
  meta?: PageMetaTags
  data?: Record<string, unknown>
}

export interface Heading {
  level: number
  text: string
  slug: string
}

export interface ChangelogEntry {
  version: string
  slug: string
  title: string
  description?: string
  releaseDate?: string
  hidden?: boolean
  html: string
  headings: Heading[]
  data?: Record<string, unknown>
}

export interface PageShell {
  slug: string
  path: string
  type: PageType
  frontmatter: Frontmatter
}

export interface PageBody {
  html: string
  headings: Heading[]
  openApiSpec?: unknown
  changelogEntries?: ChangelogEntry[]
  roadmapEntries?: RoadmapEntry[]
  componentData?: ComponentPageData
}

export interface PageModule extends PageShell, PageBody {}

export interface SidebarNode {
  text: string
  link?: string
  slug?: string
  scope?: string
  claim?: string
  icon?: string
  order?: number
  collapsed?: boolean
  hidden?: boolean
  items?: SidebarNode[]
}

export interface Manifest {
  pages: Record<string, PageMeta>
  byPath: Record<string, string>
  sidebar: SidebarNode[]
  site?: SiteMeta
  styles?: Record<string, string>
}

export interface SiteMeta {
  title: string
  url?: string
  description?: string
  ogImage?: string
  twitterSite?: string
  locale?: string
}

export interface PageMeta {
  slug: string
  path: string
  type: PageType
  title: string
  scope?: string
  claim?: string
  description?: string
  order?: number
  hidden?: boolean
  redirect?: string
  meta?: PageMetaTags
}

export interface SearchEntry {
  slug: string
  path: string
  title: string
  description?: string
  body: string
  scope?: string
  claim?: string
  headings: string[]
  tags: string[]
}

export interface Viewer {
  authenticated: boolean
  id?: string
  firstName?: string
  lastName?: string
  userName?: string
  phone?: string
  email?: string
  location?: string
  type?: 'user' | 'client' | 'system' | 'guest'
}

export interface AccessRequirement {
  scope?: string
  claim?: string
}

export type AccessChecker = (
  required: AccessRequirement,
  viewer: Viewer
) => boolean

export interface NimpressBrandConfig {
  primary?: string
  primaryHover?: string
}

export interface NimpressAuthCallbacks {
  onSession?: (user: unknown) => void | Promise<void>
  onLogin?: (url: string, returnTo?: string) => void
  onLogout?: (url: string, returnTo?: string) => void | Promise<void>
  onUnauthenticated?: (returnTo?: string) => void
  onSubscribe?: (input: NimpressSubscribeInput) => void | Promise<void>
}

export interface NimpressSubscribeInput {
  title: string
  feedUrl: string
  xml: string
  email?: string
}

export interface NimpressSubscribeConfig {
  endpoint?: string
  appSlug?: string
}

export interface NimpressMetaConfig {
  keywords?: string[]
  localeAlternates?: string[]
  organization?: Record<string, unknown>
  robots?: {
    block?: string[]
    append?: string
    custom?: string
  }
  llms?: {
    summary?: string
    append?: string
    full?: boolean
  }
  og?: {
    width?: number
    height?: number
  }
  webmanifest?: Record<string, unknown>
  humans?: string
  security?: {
    contact?: string
    policy?: string
    languages?: string
    canonical?: string
    expires?: string
  }
}

export interface NimpressConfig {
  title: string
  logo?: string
  github?: string
  brand?: NimpressBrandConfig
  contentRoot: string
  navRoutes?: NavRoute[]
  authEndpoint?: string
  clientSlug?: string
  authMode?: 'edge' | 'bff'
  bffPath?: string
  authCallbacks?: NimpressAuthCallbacks
  subscribe?: NimpressSubscribeConfig
  site?: SiteMeta
  footer?: string
  manifest?: Manifest
  searchIndex?: SearchEntry[]
  pageLoader?: Record<string, () => Promise<{ default: unknown } | unknown>>
  bodyLoader?: Record<string, () => Promise<PageBody>>
  accessChecker?: AccessChecker
}

export interface NimpressBannerConfig {
  title?: string
  tagline?: string
  company?: string
  version?: string
}

export interface NimpressUserConfig {
  title?: string
  logo?: string
  github?: string
  brand?: NimpressBrandConfig
  footer?: string
  navRoutes?: NavRoute[]
  authEndpoint?: string
  clientSlug?: string
  authMode?: 'edge' | 'bff'
  bffPath?: string
  authHooks?: string
  subscribe?: NimpressSubscribeConfig
  meta?: NimpressMetaConfig
  site?: SiteMeta
  contentDir?: string
  assetsDir?: string
  assetUrlBase?: string
  outDir?: string
  exclude?: string[]
  defaultFrontmatter?: Partial<Frontmatter>
  defaultFrontmatterExclude?: string[]
  banner?: NimpressBannerConfig | false
  css?: string | string[]
  vite?: Record<string, unknown>
  modules?: Partial<ModulesConfig>
}

export interface ResolvedNimpressConfig {
  title: string
  logo?: string
  github?: string
  brand?: NimpressBrandConfig
  footer?: string
  navRoutes?: NavRoute[]
  authEndpoint?: string
  clientSlug?: string
  authMode?: 'edge' | 'bff'
  bffPath?: string
  authHooks?: string
  subscribe?: NimpressSubscribeConfig
  meta?: NimpressMetaConfig
  site?: SiteMeta
  contentDir: string
  assetsDir: string
  assetUrlBase: string
  outDir: string
  exclude: string[]
  defaultFrontmatter: Partial<Frontmatter>
  defaultFrontmatterExclude: string[]
  banner: NimpressBannerConfig | false
  css: string[]
  vite: Record<string, unknown>
  modules: ModulesConfig
}

export interface NavRoute {
  text: string
  link: string
  scope?: string
  claim?: string
}

export interface OpenApiOperation {
  id: string
  method: string
  path: string
  tag: string
  summary: string
  description?: string
  parameters?: OpenApiParameter[]
  requestBody?: unknown
  responses?: Record<string, unknown>
}

export interface OpenApiParameter {
  name: string
  in: string
  required?: boolean
  schema?: unknown
  description?: string
}
