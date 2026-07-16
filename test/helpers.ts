import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { defaultConfig } from '../src/config/defaults'
import type { ResolvedNimpressConfig } from '../src/types'

export interface Repo {
  cwd: string
  cleanup: () => void
}

export function makeRepo(): Repo {
  const cwd = mkdtempSync(join(tmpdir(), 'nimpress-test-'))
  return {
    cwd,
    cleanup: () => rmSync(cwd, { recursive: true, force: true })
  }
}

export function file(cwd: string, rel: string, content: string): string {
  const full = join(cwd, rel)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
  return full
}

export function resolvedConfig(overrides: Partial<ResolvedNimpressConfig> = {}): ResolvedNimpressConfig {
  return {
    ...defaultConfig,
    ...overrides,
    modules: {
      ...defaultConfig.modules,
      ...(overrides.modules ?? {})
    }
  }
}

export function componentPage(system: string, component: string): string {
  return `---
title: ${component}
type: component
data:
  system: ${system}
  component: ${component}
---

## Usage
`
}
