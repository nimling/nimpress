# Paths and the cache root

Every folder nimpress writes is declared under the optional `paths` block in the config, each field carrying a default. This rule is the contract for where files may appear, for the tool and for anyone working in a consumer repo.

1. `paths.out`, default `dist`, is the build root. Build artifacts only.

2. `paths.cache`, default `node_modules/.nimpress`, is the single cache root for every operation, layered per feature beneath it.

2.1. `<cache>/site` holds the docs vite cache.

2.2. `<cache>/modules/<system>` holds the harness cache for each component system.

2.3. `<cache>/lint` holds the lint verification build and is removed when lint finishes.

2.4. `<cache>/verify` is the scratch layer for throwaway verification pages: harness html an agent or a human drops in to exercise a component through the running dev server, loaded same origin through the server's `@fs` urls. nimpress never reads or writes this layer. Whoever creates a file here deletes it when the verification is done.

3. `paths.export`, default `.nimpress`, is the handoff folder the export command fills for the docs-sync pipeline. An artifact, not a cache.

4. `paths.modules` and `paths.guarded`, defaults `_components` and `_guarded`, are both the folders under `out` and the served url segments.

## Never

1. Never write ephemeral files anywhere else: not the repo root, not a new dot folder under `node_modules`, not a temp dir the dev server cannot serve. The cache root is the one sanctioned location and `<cache>/verify` is the one sanctioned scratch layer.

2. Never write by hand into `<cache>/site`, `<cache>/modules/<system>`, or `<cache>/lint`. Those layers are owned by the commands that build them.

3. Never commit anything from the cache root. It lives under `node_modules` so git never sees it.
