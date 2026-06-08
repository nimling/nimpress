export type PageType = 'doc' | 'openapi' | 'changelog' | 'hero'

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
  items?: SidebarNode[]
}

export interface Manifest {
  pages: Record<string, PageMeta>
  byPath: Record<string, string>
  sidebar: SidebarNode[]
  site?: SiteMeta
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

export interface NimpressConfig {
  title: string
  logo?: string
  github?: string
  brand?: NimpressBrandConfig
  contentRoot: string
  navRoutes?: NavRoute[]
  authEndpoint?: string
  clientSlug?: string
  site?: SiteMeta
  footer?: string
  manifest?: Manifest
  searchIndex?: SearchEntry[]
  pageLoader?: Record<string, () => Promise<{ default: unknown } | unknown>>
  bodyLoader?: Record<string, () => Promise<PageBody>>
  accessChecker?: AccessChecker
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
