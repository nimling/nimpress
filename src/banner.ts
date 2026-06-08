import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface BannerOptions {
  title?: string
  tagline?: string
  company?: string
  version?: string
  localUrl?: string
  networkUrl?: string
  duration?: number
}

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CORAL = '\x1b[38;2;204;120;92m'
const SOFT = '\x1b[38;2;229;174;156m'
const GREY = '\x1b[38;2;160;160;170m'

const ART = [
  '             ███╗   ██╗ ██╗ ███╗   ███╗ ██████╗  ██████╗  ███████╗ ███████╗ ███████╗',
  '             ████╗  ██║ ██║ ████╗ ████║ ██╔══██╗ ██╔══██╗ ██╔════╝ ██╔════╝ ██╔════╝',
  '             ██╔██╗ ██║ ██║ ██╔████╔██║ ██████╔╝ ██████╔╝ █████╗   ███████╗ ███████╗',
  '             ██║╚██╗██║ ██║ ██║╚██╔╝██║ ██╔═══╝  ██╔══██╗ ██╔══╝   ╚════██║ ╚════██║',
  '             ██║ ╚████║ ██║ ██║ ╚═╝ ██║ ██║      ██║  ██║ ███████╗ ███████║ ███████║',
  '             ╚═╝  ╚═══╝ ╚═╝ ╚═╝     ╚═╝ ╚═╝      ╚═╝  ╚═╝ ╚══════╝ ╚══════╝ ╚══════╝'
]

const BOX_WIDTH = 60

function pad(line: string, width: number): string {
  const visible = line.replace(/\x1b\[[0-9;]*m/g, '')
  const space = Math.max(0, width - visible.length)
  return line + ' '.repeat(space)
}

function box(lines: string[]): string[] {
  const top = '╔' + '═'.repeat(BOX_WIDTH + 2) + '╗'
  const mid = '╠' + '═'.repeat(BOX_WIDTH + 2) + '╣'
  const bot = '╚' + '═'.repeat(BOX_WIDTH + 2) + '╝'
  const out: string[] = [top]
  for (let i = 0; i < lines.length; i++) {
    out.push('║ ' + pad(lines[i], BOX_WIDTH) + ' ║')
    if (i < lines.length - 1) out.push(mid)
  }
  out.push(bot)
  return out
}

export function buildBanner(opts: BannerOptions = {}): string {
  const title = opts.title ?? 'Nimpress'
  const tagline = opts.tagline ?? 'Docs framework on Svelte'
  const company = opts.company ?? `Samna® ${new Date().getFullYear()}`
  const version = opts.version ?? 'dev'
  const local = opts.localUrl ?? 'http://localhost:5173/'
  const network = opts.networkUrl ?? 'use --host to expose'
  const duration = typeof opts.duration === 'number' ? `ready in ${opts.duration} ms` : 'ready'

  const lines: string[] = []
  lines.push('')
  for (const row of ART) lines.push(CORAL + row + RESET)
  lines.push('')

  const summary = box([
    `${BOLD}${title}${RESET}${GREY}  ·  ${company}${RESET}`,
    `${GREY}${tagline}${RESET}`,
    `${SOFT}Version${RESET} ${version}    ${SOFT}${duration}${RESET}`,
    `${SOFT}➜${RESET} Local    ${BOLD}${local}${RESET}`,
    `${SOFT}➜${RESET} Network  ${DIM}${network}${RESET}`
  ])
  for (const row of summary) lines.push('                       ' + row)
  lines.push('')
  return lines.join('\n')
}

export function printBanner(opts: BannerOptions = {}): void {
  process.stdout.write(buildBanner(opts) + '\n')
}

export function readConsumerPackage(): { name?: string; version?: string } {
  try {
    const raw = readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
    const json = JSON.parse(raw)
    return { name: json.name, version: json.version }
  } catch {
    return {}
  }
}
