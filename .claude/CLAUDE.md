# Nimpress

Reusable Svelte 5 docs framework. Library mode Vite build. Consumed by sibling repos through `link:../nimpress` during development and through GitHub Packages once published.

## What lives here

1. `src/index.ts` — public Svelte component and store exports.

2. `src/plugin.ts` — Vite plugin entry, separate so consumers can import it in `vite.config.ts` without dragging in browser code.

3. `src/framework/` — app bootstrap, router, stores. Owns `createNimpressApp`.

4. `src/layout/` — `AppShell`, `Header`, `Sidebar`, `Breadcrumbs`, `RightToc`. The shell chrome.

5. `src/markdown/` — `Page`, `ChangelogPage`, `HeroPage`, callouts, code blocks, mermaid. Renderers.

6. `src/api/` — OpenAPI renderer. `OpenApiRoot`, `Operation`, `Schema`, `TryPanel`, `CodeExamples`.

7. `src/search/` — MiniSearch wrapper and modal.

8. `src/auth/` — session login guard against `samna_auth`.

9. `src/styles/` — `tokens.css` and `preflight.css`. Override the tokens, not the components.

10. `docs/` — concept guides linked from the README. Authors read these before writing docs in consumer repos.

11. `.claude/rules/` — rules that apply when authoring or editing nimpress source or consumer docs.

## Build

1. `just install` — pnpm install.

2. `just build` — `vite build --mode library`, emits `dist/nimpress.es.js`, `dist/plugin.es.js`, `dist/tailwind.preset.js`, `dist/style.css`, and `dist/*.d.ts`.

3. `just dev` — runs the linked consumer site.

4. `just bump` — patch bump via sbump and push tag.

## Rules

1. Svelte 5 with runes only. No legacy `$:` reactivity, no Svelte 4 stores syntax inside components.

2. No React. No Vue. No React patterns rewritten as Svelte.

3. No comments in code. Use clear names instead.

4. No backwards compatibility scaffolding. Renames apply everywhere in the same change.

5. Edit existing files. Do not create parallel variants or `*.new.ts` files.

6. Public class names on rendered chrome stay stable. Rename only across a major bump.

7. Token names stay stable. Add new ones, do not rename.

## Never

1. Build, run, test, or verify unless explicitly asked.

2. Delete files. Output `rm /abs/path; rm /abs/path` for the user instead.

3. Push to remote or open PRs without explicit confirmation.

4. Use git worktrees.

5. Skip pre-commit hooks or GPG signing.
