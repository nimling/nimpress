import { z } from 'zod'
import type { NimpressUserConfig } from '../types'

const brandSchema = z.object({
  primary: z.string().optional(),
  primaryHover: z.string().optional()
}).passthrough()

const siteSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  description: z.string().optional(),
  ogImage: z.string().optional(),
  twitterSite: z.string().optional(),
  locale: z.string().optional()
}).passthrough()

const navRouteSchema = z.object({
  text: z.string(),
  link: z.string(),
  scope: z.string().optional(),
  claim: z.string().optional()
})

const bannerSchema = z.object({
  title: z.string().optional(),
  tagline: z.string().optional(),
  company: z.string().optional(),
  version: z.string().optional()
}).passthrough()

export const userConfigSchema = z.object({
  title: z.string().optional(),
  logo: z.string().optional(),
  github: z.string().optional(),
  brand: brandSchema.optional(),
  footer: z.string().optional(),
  navRoutes: z.array(navRouteSchema).optional(),
  authEndpoint: z.string().optional(),
  clientSlug: z.string().optional(),
  authMode: z.enum(['edge', 'bff']).optional(),
  bffPath: z.string().optional(),
  authHooks: z.string().optional(),
  subscribe: z.object({
    endpoint: z.string().optional(),
    appSlug: z.string().optional()
  }).passthrough().optional(),
  meta: z.object({
    keywords: z.array(z.string()).optional(),
    localeAlternates: z.array(z.string()).optional(),
    organization: z.record(z.unknown()).optional(),
    robots: z.object({
      block: z.array(z.string()).optional(),
      append: z.string().optional(),
      custom: z.string().optional()
    }).passthrough().optional(),
    llms: z.object({
      summary: z.string().optional(),
      append: z.string().optional(),
      full: z.boolean().optional()
    }).passthrough().optional(),
    og: z.object({
      width: z.number().optional(),
      height: z.number().optional()
    }).passthrough().optional(),
    webmanifest: z.record(z.unknown()).optional(),
    humans: z.string().optional(),
    security: z.object({
      contact: z.string().optional(),
      policy: z.string().optional(),
      languages: z.string().optional(),
      canonical: z.string().optional(),
      expires: z.string().optional()
    }).passthrough().optional()
  }).passthrough().optional(),
  site: siteSchema.optional(),
  contentDir: z.string().optional(),
  assetsDir: z.string().optional(),
  assetUrlBase: z.string().optional(),
  outDir: z.string().optional(),
  exclude: z.array(z.string()).optional(),
  defaultFrontmatter: z.record(z.unknown()).optional(),
  defaultFrontmatterExclude: z.array(z.string()).optional(),
  banner: z.union([bannerSchema, z.literal(false)]).optional(),
  css: z.union([z.string(), z.array(z.string())]).optional(),
  vite: z.record(z.unknown()).optional()
}).passthrough()

export function parseUserConfig(input: unknown, source: string): NimpressUserConfig {
  const result = userConfigSchema.safeParse(input)
  if (!result.success) {
    console.warn(`[nimpress] invalid config in ${source}: ${result.error.message}`)
    return {}
  }
  return result.data as NimpressUserConfig
}
