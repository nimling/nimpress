import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { hasFlag } from './shared'

const documentPath = join('.claude', 'skills', 'nimpress', 'SKILL.md')

export function skillDocument(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(here, documentPath),
    resolve(here, '..', documentPath),
    resolve(here, '..', '..', documentPath)
  ]
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, 'utf-8')
    } catch {}
  }
  throw new Error(`[nimpress] skill: SKILL.md not found, looked in ${candidates.join(', ')}`)
}

export function installSkill(cwd: string, global: boolean): string {
  const root = global ? join(homedir(), '.claude') : join(cwd, '.claude')
  const dir = join(root, 'skills', 'nimpress')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'SKILL.md')
  writeFileSync(path, skillDocument())
  console.log(`wrote ${path}`)
  return path
}

export function runSkill(cwd: string, args: string[]): void {
  const sub = args[0]
  if (sub === 'get') {
    process.stdout.write(skillDocument())
    return
  }
  if (sub === 'put') {
    installSkill(cwd, !hasFlag(args, 'project'))
    return
  }
  throw new Error('[nimpress] skill expects get or put')
}
