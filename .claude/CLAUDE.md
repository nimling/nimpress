# Nimpress

Reusable Svelte 5 docs framework. Library mode Vite build. Consumed through the `@nimtech/nimpress` package, public on npm. Its own documentation lives in `docs/`, is built with nimpress itself, and publishes to GitHub Pages at `nimling.github.io/nimpress` on every version tag.

## What lives here

1. `src/index.ts` — public Svelte component and store exports.

2. `src/plugin.ts` — Vite plugin entry, separate so consumers can import it in `vite.config.ts` without dragging in browser code.

3. `src/cli.ts` and `src/cli/` — CLI dispatch and one module per command: init, lint, site, guard, export, modules.

4. `src/modules/` — the component workshop: page collection, schema seed and upsert, story parsing, harness servers, modules lint.

5. `src/story/`, `src/harness/`, `src/mock/` — the consumer facing story helpers, harness primitives, and mock functions.

6. `src/framework/` — app bootstrap, router, stores. Owns `createNimpressApp`.

7. `src/layout/` — `AppShell`, `Header`, `Sidebar`, `Breadcrumbs`, `RightToc`. The shell chrome.

8. `src/markdown/` — `Page`, `ChangelogPage`, `HeroPage`, `RoadmapPage`, `ComponentPage`, `DbmlPage`, callouts, code blocks, mermaid, dbml. Renderers.

9. `src/api/` — OpenAPI renderer. `OpenApiRoot`, `Operation`, `Schema`, `TryPanel`, `CodeExamples`.

10. `src/dbml/` — DBML to diagram model conversion, run at build time by the plugin. `erd.ts` is the only place the mapping lives.

11. `src/search/` — MiniSearch wrapper and modal.

12. `src/auth/` — session login guard against `samna_auth`.

13. `src/styles/` — `tokens.css` and `preflight.css`. Override the tokens, not the components.

14. `docs/` — the nimpress documentation itself, every feature, guide, and release entry under `docs/changelog/`. It is built with nimpress and published to GitHub Pages on every version tag, and it never ships inside the library build. Authors read these before writing docs in consumer repos.

15. `.claude/rules/` — rules that apply when authoring or editing nimpress source or consumer docs. Shipped in the package; consumers read them from `node_modules/@nimtech/nimpress/.claude/rules/`.

## Build

1. `just install` — pnpm install.

2. `just build` — `vite build --mode library`, emits `dist/nimpress.es.js`, `dist/plugin.es.js`, `dist/tailwind.preset.js`, `dist/style.css`, and `dist/*.d.ts`.

3. `just dev` — serves this repo's own `docs/` against the built `dist/`, rebuilding the library on every source change and reloading the page. Set `NIMPRESS_CONSUMER=../other-site` to point it at another site instead. Needs `just build` to have run once.

3.1. `node bin/nimpress.mjs build` — builds this repo's `docs/` into `dist/site` with the built library, the same command the Pages workflow runs. The site sits under the `/nimpress/` base because that is the project page path.

4. `just bump` — patch bump via sbump and push tag.

## Rules

1. Svelte 5 with runes only. No legacy `$:` reactivity, no Svelte 4 stores syntax inside components.

2. No React. No Vue. No React patterns rewritten as Svelte.

3. No comments in code. Use clear names instead.

4. No backwards compatibility scaffolding. Renames apply everywhere in the same change.

5. Edit existing files. Do not create parallel variants or `*.new.ts` files.

6. Public class names on rendered chrome stay stable. Rename only across a major bump.

7. Token names stay stable. Add new ones, do not rename.

8. Heavy browser side renderers load through a dynamic import inside the component that owns them, never a static import from shared code. `mermaid` and `@xyflow/svelte` both follow this.

## Never

1. Build, run, test, or verify unless explicitly asked.

2. Delete files. Output `rm /abs/path; rm /abs/path` for the user instead.

3. Push to remote or open PRs without explicit confirmation.

4. Use git worktrees.

5. Skip pre-commit hooks or GPG signing.
