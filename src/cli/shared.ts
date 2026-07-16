import { readdirSync } from 'node:fs'
import { join } from 'node:path'

export function flag(args: string[], name: string): string | undefined {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`)
}

export function positional(args: string[], index: number): string | undefined {
  const hit = args.filter((a) => !a.startsWith('--'))[index]
  return hit
}

export function walkFiles(dir: string, out: string[] = []): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walkFiles(full, out)
    } else if (entry.isFile()) {
      out.push(full)
    }
  }
  return out
}

export function finishLint(label: string, problems: string[], okMessage: string): void {
  if (problems.length) {
    console.error(`${label} failed with ${problems.length} problems`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }
  console.log(okMessage)
}
