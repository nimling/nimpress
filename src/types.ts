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
  /** System identifier, the folder name under the modules route and the value component pages reference in data.system. @example "nimtech" */
  name: string
  /** Component framework of this system, decides the harness entry, the parser, and the story helper. @example "vue" */
  framework: ModuleFramework
  /** Local component tree, resolved as <source>/<Name>/<Name>.<ext> or <source>/<Name>.<ext>. @example "./src/components" */
  source?: string
  /** Released npm package the harness imports components from when they do not resolve from source. @example "@nimling/components-nimtech" */
  package?: string
  /** Version pin recorded on exported pages. @example "1.4.2" */
  version?: string
  /** Stylesheets loaded inside the harness iframe, token and theme sheets. @example ["./src/assets/style.css"] */
  css?: string[]
  /** Module replacing the harness bootstrap: default export carries install(app) and companion for vue, a bare function for svelte. @example "./docs/harness-setup.ts" */
  setup?: string
  /** Relative path to the system harness component wrapping every story, .ts, .tsx, .vue, or .svelte. @example "./docs/components/harness.vue" */
  harness?: string
  /** Fixed dev port for this system's harness server, allocated from 6161 by sorted system name when absent. @example 6161 */
  port?: number
  /** dev-only keeps the system in nimpress dev and out of the built bundle, visible is the default. @example "dev-only" */
  visibility?: 'visible' | 'dev-only'
  /** Width bounds of the component area inside the harness frame, numbers are px. When set the area spans the frame like a page column clamped between the bounds. @example { minWidth: 360, maxWidth: 1200 } */
  stage?: ModuleStageConfig
}

export interface ModuleStageConfig {
  minWidth?: number | string
  maxWidth?: number | string
  padding?: number | string
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
  | 'object'
  | 'array'
  | 'record'
  | 'function'
  | 'event'
  | 'json'
  | 'slot'

export interface ControlSpec {
  name: string
  kind: ControlKind
  type: string
  default?: unknown
  options?: string[]
  required?: boolean
  description?: string
  shape?: string
  format?: string
  mock?: string
  bindable?: boolean
  annotations?: Record<string, unknown>
  members?: ControlSpec[]
  item?: ControlSpec
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
  gate?: string
  description?: string
  order?: number
  icon?: string
  sidebar?: { name: string; icon?: string; style?: string; path?: string }
  visibility?: 'visible' | 'hidden' | 'dev-only'
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
  bundle?: string
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
  gate?: string
  icon?: string
  style?: string
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
  gate?: string
  bundle?: string
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
  gate?: string
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
  gate?: string
}

export type AccessChecker = (
  required: AccessRequirement,
  viewer: Viewer
) => boolean

export type GuardFunction = (
  frontmatter: Frontmatter,
  filePath: string,
  relatedFiles: string[]
) => string

export interface NimpressBrandConfig {
  /** Brand color written onto --np-brand. @example "#CC785C" */
  primary?: string
  /** Hover variant written onto --np-brand-hover. @example "#B86A52" */
  primaryHover?: string
}

export interface SubscribeContext {
  endpoint: string
  appSlug: string
  headers: Record<string, string>
  viewer: Viewer
}

export interface SubscribeFunctions {
  subscribe?: (ctx: SubscribeContext, feed: string) => Promise<void>
}

export interface SubscribeConfig {
  /** Subscription endpoint receiving feed subscriptions. @example "https://auth.example.io/api/subscribe" */
  endpoint?: string
  /** App slug the subscription registers under. @example "samna-developer" */
  appSlug?: string
  functions?: SubscribeFunctions
}

export interface NimpressMetaConfig {
  /** Site wide keywords merged into every page head. @example ["booking", "api"] */
  keywords?: string[]
  /** Locale codes emitted as hreflang alternates. @example ["en", "nb"] */
  localeAlternates?: string[]
  /** Organization JSON LD object written on every page. */
  organization?: Record<string, unknown>
  robots?: {
    /** Crawler user agents to disallow. @example ["GPTBot"] */
    block?: string[]
    /** Extra lines appended to robots.txt. */
    append?: string
    /** Full robots.txt replacement, overrides everything else. */
    custom?: string
  }
  llms?: {
    /** One line summary at the top of llms.txt. */
    summary?: string
    /** Extra markdown appended to llms.txt. */
    append?: string
    /** Also emit llms-full.txt with every page body. @example true */
    full?: boolean
  }
  og?: {
    /** OpenGraph image width. @example 1200 */
    width?: number
    /** OpenGraph image height. @example 600 */
    height?: number
  }
  /** site.webmanifest content, emitted verbatim. */
  webmanifest?: Record<string, unknown>
  /** humans.txt content, emitted verbatim. */
  humans?: string
  security?: {
    /** security.txt Contact line. @example "mailto:security@example.io" */
    contact?: string
    /** security.txt Policy url. */
    policy?: string
    /** security.txt Preferred-Languages. @example "en, nb" */
    languages?: string
    /** security.txt Canonical url. */
    canonical?: string
    /** security.txt Expires timestamp. @example "2027-01-01T00:00:00.000Z" */
    expires?: string
  }
}

export interface OidcEndpoints {
  discovery?: string
  authorization?: string
  token?: string
  userinfo?: string
  endSession?: string
  jwks?: string
}

export interface RelyingParty {
  clientId: string
  scopes: string
  redirectPath: string
  headers: Record<string, string>
  endpoints: OidcEndpoints
  authorizeUrl: (returnTo: string) => Promise<string>
  mapViewer: (raw: Record<string, unknown>) => Viewer
}

export interface AuthFunctions {
  resolveViewer?: (rp: RelyingParty) => Promise<Viewer | null>
  startLogin?: (rp: RelyingParty, returnTo: string) => void | Promise<void>
  endSession?: (rp: RelyingParty, returnTo: string) => void | Promise<void>
  checkAccess?: AccessChecker
}

export interface AuthConfig {
  /** OAuth 2.0 issuer url. @example "https://auth.example.io" */
  issuer: string
  /** OAuth client id of this site. @example "samna-developer" */
  clientId: string
  /** Requested scopes. @example "openid profile email" */
  scopes?: string
  /** Redirect path on this origin. @example "/auth/callback" */
  redirectPath?: string
  /** Extra headers sent to the auth endpoints. */
  headers?: Record<string, string>
  /** Endpoint overrides when discovery is unavailable. */
  endpoints?: OidcEndpoints
  /** Runtime auth functions supplied through the client module. */
  functions?: AuthFunctions
  /**
   * Build time bundling of gated pages. Called once per page carrying a gate value; the returned
   * string names the guarded bundle the page lands in under dist/_guarded/<name>/. Requires a
   * nimpress.config.ts since json carries no functions; without it the gate value is the bundle name.
   * @example (frontmatter) => frontmatter.gate === "internal" ? "staff" : "partners"
   */
  guard?: GuardFunction
}

export interface NimpressConfig {
  title: string
  logo?: string
  github?: string
  brand?: NimpressBrandConfig
  contentRoot: string
  navRoutes?: NavRoute[]
  auth?: AuthConfig
  subscribe?: SubscribeConfig
  site?: SiteMeta
  footer?: string
  manifest?: Manifest
  searchIndex?: SearchEntry[]
  pageLoader?: Record<string, () => Promise<{ default: unknown } | unknown>>
  bodyLoader?: Record<string, () => Promise<PageBody>>
  accessChecker?: AccessChecker
}

export interface NimpressBannerConfig {
  /** Banner title, defaults to the site title. */
  title?: string
  /** Line under the title. @example "Component workshop" */
  tagline?: string
  /** Company name in the banner footer. @example "Nimling" */
  company?: string
  /** Version label, defaults to the consumer package version. */
  version?: string
}

export interface NimpressUserConfig {
  /** Site title shown in the header and the tab. @example "Nimtech Components" */
  title?: string
  /** Header logo url, absolute or under assetUrlBase. @example "/assets/logo.svg" */
  logo?: string
  /** Repository url rendered as the header GitHub link. @example "https://github.com/nimling/nimpress" */
  github?: string
  /** Brand colors written onto the theme tokens. @example { "primary": "#CC785C" } */
  brand?: NimpressBrandConfig
  /** Site wide footer line, overridable per page with the footer frontmatter field. */
  footer?: string
  /** Extra header navigation routes. @example [{ "text": "API", "link": "/api" }] */
  navRoutes?: NavRoute[]
  /** OAuth 2.0 session login and the build time guard function for gated pages. */
  auth?: AuthConfig
  /** Path to a client module exporting authFunctions and subscribeFunctions. @example "./docs/client.ts" */
  client?: string
  /** Changelog subscription wiring. */
  subscribe?: SubscribeConfig
  /** SEO, robots, llms.txt, webmanifest, and security.txt emission. */
  meta?: NimpressMetaConfig
  /** Canonical site identity used for absolute urls, sitemap, and social cards. @example { "title": "Docs", "url": "https://developer.example.io" } */
  site?: SiteMeta
  /** Folder holding the markdown content. @example "docs" */
  contentDir?: string
  /** Root assets folder copied into the build. @example "assets" */
  assetsDir?: string
  /** Url base the assets folder serves under. @example "/assets" */
  assetUrlBase?: string
  /** Build output folder. @example "dist" */
  outDir?: string
  /** Slug prefixes excluded from the site. @example ["drafts"] */
  exclude?: string[]
  /** Frontmatter defaults applied to every page that leaves the field unset. @example { "lastUpdated": true } */
  defaultFrontmatter?: Partial<Frontmatter>
  /** Path prefixes the frontmatter defaults skip. @example ["/api"] */
  defaultFrontmatterExclude?: string[]
  /** Dev server banner, false disables it. */
  banner?: NimpressBannerConfig | false
  /** Extra stylesheets loaded after the framework styles. @example "docs/overrides.css" */
  css?: string | string[]
  /** Vite overrides merged into the site and harness configs. @example { "resolve": { "alias": { "@": "./src" } } } */
  vite?: Record<string, unknown>
  /** Component workshop systems, one entry per component library. */
  modules?: ModuleSystemConfig[]
}

export interface ResolvedNimpressConfig {
  title: string
  logo?: string
  github?: string
  brand?: NimpressBrandConfig
  footer?: string
  navRoutes?: NavRoute[]
  auth?: AuthConfig
  client?: string
  subscribe?: SubscribeConfig
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
  gate?: string
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
