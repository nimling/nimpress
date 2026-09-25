#!/usr/bin/env bash
set -euo pipefail
if [ "$(jq -r .name package.json 2>/dev/null)" = "@nimtech/nimpress" ]; then
  exec node bin/nimpress.mjs mcp
fi
if [ -x node_modules/.bin/nimpress ]; then
  exec node_modules/.bin/nimpress mcp
fi
exec pnpm --silent --package=@nimtech/nimpress dlx nimpress mcp
