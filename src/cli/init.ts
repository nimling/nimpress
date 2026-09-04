import { join } from 'node:path'
import { writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { defaultConfig } from '../config/defaults'
import { hasFlag } from './shared'

function annotatedConfig(): string {
  return `import { defineConfig } from '@nimtech/nimpress/plugin'

/**
 * Every field has a default, so a config can be as small as a title.
 * Hover any field for its full description and an example, the types
 * ship with @nimtech/nimpress. Uncomment what you need.
 */
export default defineConfig({
  /** Site title shown in the header and the tab. */
  title: ${JSON.stringify(defaultConfig.title)},

  /** Folder holding the markdown content. Default ${JSON.stringify(defaultConfig.contentDir)}. */
  // contentDir: 'docs',

  /** Root assets folder copied into the build, never inside contentDir. Default ${JSON.stringify(defaultConfig.assetsDir)}. */
  // assetsDir: 'assets',

  /** Url base the assets folder serves under. Default ${JSON.stringify(defaultConfig.assetUrlBase)}. */
  // assetUrlBase: '/assets',

  /**
   * Build output, cache, export, and served route folders. Every field is optional.
   * out is the build root, cache is the layered cache root under node_modules,
   * export is where the export command collects pages, modules and guarded are the
   * folders under out and the url route segments for the harness bundles and the
   * guarded content.
   */
  // paths: { out: 'dist', cache: 'node_modules/.nimpress', export: '.nimpress', modules: '_components', guarded: '_guarded' },

  /** Header logo url. @example "/assets/logo.svg" */
  // logo: '/assets/logo.svg',

  /** Repository url rendered as the header GitHub link. */
  // github: 'https://github.com/nimling/nimpress',

  /** Brand colors written onto the theme tokens --np-brand and --np-brand-hover. */
  // brand: { primary: '#CC785C', primaryHover: '#B86A52' },

  /** Footer: text is the site wide line, overridable per page with the footer frontmatter field, beside a copyright, social links, previous and next links, and the generator notice. */
  // footer: { text: 'Made with nimpress', copyright: '© 2026 Nimling', social: [{ icon: '/assets/github.svg', link: 'https://github.com/nimling', name: 'Nimling on GitHub' }], navigation: true },

  /** Announcement bar above the header. text is one markdown line, link wraps it, dismiss adds a close button remembered per text. */
  // announce: { text: 'v2.4 is out', link: '/changelog', dismiss: true },

  /** Repository actions on every doc page. url defaults to github, editUri to edit/main/<contentDir>/, actions lists edit and view. */
  // repo: { actions: ['edit', 'view'] },

  /** The was this page helpful widget, shown on pages with feedback: true. Each rating carries an icon, a name, the data, and a markdown note shown after the click; endpoint receives every click as a json post. */
  // feedback: { title: 'Was this page helpful?', endpoint: 'https://auth.example.io/api/feedback', ratings: [{ icon: '👍', name: 'This page was helpful', data: '1', note: 'Thanks for your feedback!' }] },

  /** Page status identifiers mapped to the label the sidebar mark carries. new and deprecated are present without configuration. */
  // status: { beta: 'Beta' },

  /** Content tab groups. linked selects the same label in every tab group on the site when one is clicked, remembered across pages. */
  // tabs: { linked: true },

  /** Image behavior in the prose. lightbox opens every image full size on click; without it only images carrying the zoom class open. */
  // images: { lightbox: true },

  /** Folder of custom svg icons a :name: shortcode resolves in, beside the lucide set. */
  // icons: './assets/icons',

  /** Math syntax in the prose. false turns off $...$ and $$...$$ for sites that write dollar signs. */
  // math: false,

  /** Tag icons by identifier, default for every tag without one, and the tag to identifier map so a group shares an icon. */
  // tags: { icons: { default: ':lucide-tag:', api: ':lucide-plug:' }, map: { OpenAPI: 'api' } },

  /** Custom page types: a type name to a Svelte component file. A new name registers a type, a built in name such as hero replaces its renderer. */
  // pageTypes: { spotlight: './docs/types/Spotlight.svelte' },

  /** Generated metadata: auto fills keywords and a description on every page without authored ones, ai.index false blocks every known ai crawler. */
  // seo: { auto: true, ai: { index: false } },

  /** Extra header navigation routes. gate hides an entry from viewers that fail the check. */
  // navRoutes: [{ text: 'API', link: '/api' }],

  /** Canonical site identity used for absolute urls, sitemap, feeds, and social cards. */
  // site: { title: 'Docs', url: 'https://developer.example.io', description: 'One sentence.' },

  /** SEO, robots, llms.txt, webmanifest, and security.txt emission. */
  // meta: { keywords: ['docs'], llms: { full: true } },

  /**
   * OAuth 2.0 session login. The guard function runs at build time, once per page
   * carrying a gate frontmatter value; the returned string names the guarded bundle
   * the page lands in under dist/_guarded/<name>/. Without it the gate value is the
   * bundle name.
   */
  // auth: {
  //   issuer: 'https://auth.example.io',
  //   clientId: 'my-docs',
  //   guard: (frontmatter, filePath, relatedFiles) => frontmatter.gate ?? 'default'
  // },

  /** Path to a client module exporting authFunctions, subscribeFunctions, and feedbackFunctions. */
  // client: './docs/client.ts',

  /** Changelog subscription wiring. */
  // subscribe: { endpoint: 'https://auth.example.io/api/subscribe', appSlug: 'my-docs' },

  /** Slug prefixes excluded from the site. */
  // exclude: ['drafts'],

  /** Frontmatter defaults applied to every page that leaves the field unset. */
  // defaultFrontmatter: { lastUpdated: true },

  /** Path prefixes the frontmatter defaults skip. */
  // defaultFrontmatterExclude: ['/api'],

  /** Dev server banner, false disables it. */
  // banner: { tagline: 'Component workshop', company: 'Nimling' },

  /** Extra stylesheets loaded after the framework styles. */
  // css: 'docs/overrides.css',

  /** Vite overrides merged into the site and harness configs. */
  // vite: { resolve: { alias: { '@': './src' } } },

  /**
   * Component workshop systems, one entry per component library.
   * @example
   * modules: [{
   *   name: 'nimtech',
   *   framework: 'vue',
   *   source: './src/components',
   *   package: '@nimling/components-nimtech',
   *   css: ['./src/assets/style.css'],
   *   harness: './docs/components/harness.vue'
   * }]
   */
  // modules: []
})
`
}

function jsonSeed(): string {
  return (
    JSON.stringify(
      {
        $schema: './node_modules/@nimtech/nimpress/config.schema.json',
        title: defaultConfig.title,
        contentDir: defaultConfig.contentDir,
        assetsDir: defaultConfig.assetsDir,
        assetUrlBase: defaultConfig.assetUrlBase
      },
      null,
      2
    ) + '\n'
  )
}

function agentGuide(contentDir: string): string {
  return `# Nimpress project

This site is built with @nimtech/nimpress. Content lives in \`${contentDir}/\` as markdown with typed frontmatter.

The full documentation is at https://nimling.github.io/nimpress/.

The authoritative AI working rules ship inside the package at \`node_modules/@nimtech/nimpress/.claude/rules/\`. Read the relevant rule before writing:

1. \`frontmatter.md\` and \`page-types.md\` before creating or editing any page.

2. \`docs-authoring.md\` and \`style.md\` for prose, structure, and markdown surface.

3. \`component-modules.md\` before touching component pages, stories, controls, or the modules CLI.

4. \`changelog-entries.md\`, \`roadmap-entries.md\`, and \`dbml-pages.md\` for those page types.

5. \`docs-sync.md\` and \`deploy.md\` for publishing flows and the export header.

6. \`file-layout.md\` and \`doc-pages.md\` for where files go.

7. \`paths.md\` for every folder nimpress writes and the one sanctioned scratch layer for verification pages under the cache root.

## Commands

1. \`nimpress dev\` runs the site and every component harness.

2. \`nimpress lint\` validates structure, frontmatter, and imports, then builds and reports build errors; run it after content changes.

3. \`nimpress modules lint\` checks component pages for framework mixups, missing schema files, and structural drift between the schema and the stories and component source.

4. \`nimpress build\` emits the static site plus harness bundles.

5. \`nimpress modules import | create | story | update\` manage component pages, with \`--system=<name>\` when several systems are configured; never hand roll importer scripts.

6. \`nimpress modules update <name>\` upserts the schema from the component types, adding new members without touching authored defaults, enums, or descriptions; the workshop controls read the schema, not the source.

7. \`nimpress export --target=<name>\` collects pages marked \`export: <name>\` into \`.nimpress\` for the docs pipeline.

8. \`nimpress guard map\` and \`nimpress guard apply\` wire gated pages, marked with the \`gate:\` frontmatter field, to the auth provider artifacts.
`
}

export function runInit(cwd: string): void {
  const tsPath = join(cwd, 'nimpress.config.ts')
  const jsonPath = join(cwd, 'nimpress.config.json')
  const wantsJson = hasFlag(process.argv.slice(2), 'json')
  if (!existsSync(tsPath) && !existsSync(jsonPath)) {
    if (wantsJson) {
      writeFileSync(jsonPath, jsonSeed())
      console.log(`nimpress init: ${jsonPath} written, field descriptions come from the referenced config.schema.json`)
    } else {
      writeFileSync(tsPath, annotatedConfig())
      console.log(`nimpress init: ${tsPath} written with every field documented, uncomment what you need`)
    }
  }
  const contentDir = join(cwd, defaultConfig.contentDir)
  const empty = !existsSync(contentDir) || readdirSync(contentDir).length === 0
  if (empty) {
    mkdirSync(contentDir, { recursive: true })
    writeFileSync(
      join(contentDir, 'index.md'),
      '---\ntitle: Home\n---\n\nWelcome to your Nimpress site.\n'
    )
  }
  const guide = agentGuide(defaultConfig.contentDir)
  for (const name of ['CLAUDE.md', 'AGENTS.md']) {
    const target = join(cwd, name)
    if (!existsSync(target)) {
      writeFileSync(target, guide)
      console.log(`nimpress init: ${name} written, pointing at the packaged rules in node_modules/@nimtech/nimpress/.claude/rules/`)
    }
  }
}
