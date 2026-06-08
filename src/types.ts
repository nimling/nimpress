export type PageType = 'doc' | 'openapi'

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
}

export interface Heading {
  level: number
  text: string
  slug: string
}

export interface PageModule {
  slug: string
  path: string
  type: PageType
  frontmatter: Frontmatter
  html: string
  headings: Heading[]
  openApiSpec?: unknown
}

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
  manifest?: Manifest
  searchIndex?: SearchEntry[]
  pageLoader?: Record<string, () => Promise<{ default: PageModule } | PageModule>>
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
