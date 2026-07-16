import { join } from 'node:path'
import { writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { defaultConfig } from '../config/defaults'

function agentGuide(contentDir: string): string {
  return `# Nimpress project

This site is built with @nimling/nimpress. Content lives in \`${contentDir}/\` as markdown with typed frontmatter.

The authoritative AI working rules ship inside the package at \`node_modules/@nimling/nimpress/.claude/rules/\`. Read the relevant rule before writing:

1. \`frontmatter.md\` and \`page-types.md\` before creating or editing any page.

2. \`docs-authoring.md\` and \`style.md\` for prose, structure, and markdown surface.

3. \`component-modules.md\` before touching component pages, stories, controls, or the modules CLI.

4. \`changelog-entries.md\` and \`roadmap-entries.md\` for those page types.

5. \`docs-sync.md\` and \`deploy.md\` for publishing flows and the export header.

6. \`file-layout.md\` and \`doc-pages.md\` for where files go.

## Commands

1. \`nimpress dev\` runs the site and every component harness.

2. \`nimpress lint\` validates all frontmatter and every import in content story and helper files; run it after content changes.

3. \`nimpress modules lint\` checks component pages for framework mixups, missing schema.json files, and schema.json drift against stories and component source.

4. \`nimpress build\` emits the static site plus harness bundles.

5. \`nimpress modules import | create | story\` manage component pages; never hand roll importer scripts.

6. \`nimpress modules create --component=<name> --schema\` regenerates schema.json from the component types.

7. \`nimpress export --target=<name>\` collects pages marked \`export: <name>\` for the docs pipeline.
`
}

export function runInit(cwd: string): void {
  const configPath = join(cwd, 'nimpress.config.json')
  if (!existsSync(configPath)) {
    const seed = {
      title: defaultConfig.title,
      contentDir: defaultConfig.contentDir,
      assetsDir: defaultConfig.assetsDir,
      assetUrlBase: defaultConfig.assetUrlBase,
      outDir: defaultConfig.outDir
    }
    writeFileSync(configPath, JSON.stringify(seed, null, 2) + '\n')
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
      console.log(`nimpress init: ${name} written, pointing at the packaged rules in node_modules/@nimling/nimpress/.claude/rules/`)
    }
  }
}
