import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, watch } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir, platform } from 'node:os'
import { join, resolve, relative, dirname, sep } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { parse as parseYamlText } from 'yaml'
import { loadNimpressConfig } from '../config/load'
import { defaultConfig } from '../config/defaults'
import { runExport } from './export'
import { flag, hasFlag, walkFiles } from './shared'

export interface ViewLogin {
  method: 'gh' | 'ssh'
  key?: string
}

export interface ViewLink {
  repo: string
  url: string
  exportDir: string
  login?: ViewLogin
}

export interface ViewConfig {
  links: Record<string, ViewLink[]>
}

export interface SyncTarget {
  from: string
  to: string
  mode: string
}

export interface SyncConfig {
  target?: string
  targets?: SyncTarget[]
  mode?: string
}

export interface TracedSite {
  repo: string
  exportDir: string
}

export interface Receiver {
  contentRoot: string
  mapping: string
  defaults: SyncConfig
}

interface WorkflowStep {
  uses?: string
  with?: Record<string, unknown>
  env?: Record<string, unknown>
}

interface Workflow {
  env?: Record<string, unknown>
  jobs?: Record<string, { env?: Record<string, unknown>; steps?: WorkflowStep[] }>
}

export function globalConfigFile(home = homedir()): string {
  return join(home, '.nimpress', 'config.json')
}

export function sitesDir(home = homedir()): string {
  return join(home, '.tide', 'nimpress', 'sites')
}

export function readGlobalConfig(home = homedir()): ViewConfig {
  const file = globalConfigFile(home)
  if (!existsSync(file)) return { links: {} }
  const parsed = JSON.parse(readFileSync(file, 'utf-8')) as Partial<ViewConfig>
  return { links: parsed.links ?? {} }
}

export function writeGlobalConfig(config: ViewConfig, home = homedir()): void {
  const file = globalConfigFile(home)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
}

export function repoName(value: string): string {
  const trimmed = value.trim().replace(/\.git$/, '').replace(/\/+$/, '')
  const hosted = trimmed.match(/[:/]([^/:]+)\/([^/]+)$/)
  if (hosted && trimmed.includes('github.com')) return `${hosted[1]}/${hosted[2]}`
  const short = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/)
  if (short) return `${short[1]}/${short[2]}`
  throw new Error(`[nimpress] view: cannot read owner/repo from ${value}`)
}

export function repoUrl(value: string): string {
  const trimmed = value.trim()
  if (/^(https?:\/\/|git@|ssh:\/\/)/.test(trimmed)) return trimmed
  return `https://github.com/${repoName(trimmed)}.git`
}

function workflowFiles(repoRoot: string): string[] {
  const dir = join(repoRoot, '.github', 'workflows')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort()
    .map((name) => join(dir, name))
}

function readWorkflow(file: string): Workflow | null {
  try {
    const parsed = parseYamlText(readFileSync(file, 'utf-8')) as unknown
    return typeof parsed === 'object' && parsed !== null ? (parsed as Workflow) : null
  } catch {
    return null
  }
}

function resolveExpression(value: unknown, scopes: Array<Record<string, unknown> | undefined>): string {
  const text = String(value ?? '')
  return text.replace(/\$\{\{\s*env\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_, name: string) => {
    for (const scope of scopes) {
      if (scope && scope[name] !== undefined) return String(scope[name])
    }
    return ''
  }).trim()
}

function steps(workflow: Workflow, action: string): Array<{ step: WorkflowStep; scopes: Array<Record<string, unknown> | undefined> }> {
  const out: Array<{ step: WorkflowStep; scopes: Array<Record<string, unknown> | undefined> }> = []
  for (const job of Object.values(workflow.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (typeof step.uses === 'string' && step.uses.includes(`/actions/${action}@`)) {
        out.push({ step, scopes: [step.env, job.env, workflow.env] })
      }
    }
  }
  return out
}

export function traceDocsSites(repoRoot: string): TracedSite[] {
  const seen = new Map<string, TracedSite>()
  for (const file of workflowFiles(repoRoot)) {
    const workflow = readWorkflow(file)
    if (!workflow) continue
    for (const { step, scopes } of steps(workflow, 'docs-notify')) {
      const repo = resolveExpression(step.with?.['docs-repo'], scopes)
      if (!repo) continue
      const exportDir = resolveExpression(step.with?.['export-dir'], scopes) || '.nimpress'
      seen.set(repo, { repo, exportDir })
    }
  }
  return [...seen.values()]
}

function stripWorkspace(value: string): string {
  return value.replace(/\$\{\{\s*github\.workspace\s*\}\}\/?/g, '').replace(/^\.\//, '')
}

export function traceReceiver(siteDir: string, contentDir: string): Receiver {
  const receiver: Receiver = {
    contentRoot: contentDir,
    mapping: existsSync(join(siteDir, 'nimpress.sources.json')) ? 'nimpress.sources.json' : '',
    defaults: {}
  }
  for (const file of workflowFiles(siteDir)) {
    const workflow = readWorkflow(file)
    if (!workflow) continue
    for (const { step, scopes } of steps(workflow, 'docs-sync')) {
      const docsDir = stripWorkspace(resolveExpression(step.with?.['docs-dir'], scopes))
      const inside = (value: string): string => {
        const stripped = stripWorkspace(value)
        const rel = docsDir && stripped.startsWith(`${docsDir}/`) ? stripped.slice(docsDir.length + 1) : stripped
        return rel.replace(/\/+$/, '')
      }
      const contentRoot = resolveExpression(step.with?.['content-root'], scopes)
      if (contentRoot) receiver.contentRoot = inside(contentRoot)
      const mapping = resolveExpression(step.with?.['mapping'], scopes)
      if (mapping) receiver.mapping = inside(mapping)
      const defaults = resolveExpression(step.with?.['defaults'], scopes)
      if (defaults) receiver.defaults = JSON.parse(defaults) as SyncConfig
      return receiver
    }
  }
  return receiver
}

export function mergeSyncConfig(base: SyncConfig, over: SyncConfig): SyncConfig {
  const out: SyncConfig = { ...base }
  if (over.target) out.target = over.target
  if (over.targets?.length) out.targets = over.targets
  if (over.mode) out.mode = over.mode
  return out
}

export function resolvedTargets(config: SyncConfig): SyncTarget[] {
  const mode = config.mode || 'mirror'
  if (config.targets?.length) {
    return config.targets.map((target) => ({ from: target.from ?? '', to: target.to, mode: target.mode || mode }))
  }
  if (config.target) return [{ from: '', to: config.target, mode }]
  return []
}

export function syncConfigFor(siteDir: string, receiver: Receiver, sourceRepo: string): SyncConfig {
  let config = receiver.defaults
  const mappingFile = receiver.mapping ? join(siteDir, receiver.mapping) : ''
  if (mappingFile && existsSync(mappingFile)) {
    const mapping = JSON.parse(readFileSync(mappingFile, 'utf-8')) as { sources?: Record<string, SyncConfig> }
    const source = mapping.sources?.[sourceRepo]
    if (source) config = mergeSyncConfig(config, source)
  }
  return config
}

function relativeFiles(root: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>()
  if (!existsSync(root)) return out
  for (const file of walkFiles(root)) {
    out.set(relative(root, file).split(sep).join('/'), readFileSync(file))
  }
  return out
}

export function mirror(src: string, dest: string, mode: string): { added: string[]; modified: string[]; deleted: string[] } {
  const result = { added: [] as string[], modified: [] as string[], deleted: [] as string[] }
  const sources = relativeFiles(src)
  const existing = relativeFiles(dest)
  for (const [rel, data] of sources) {
    const current = existing.get(rel)
    if (current && current.equals(data)) continue
    const full = join(dest, ...rel.split('/'))
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, data)
    if (current) result.modified.push(rel)
    else result.added.push(rel)
  }
  if (mode === 'mirror') {
    for (const rel of existing.keys()) {
      if (sources.has(rel)) continue
      rmSync(join(dest, ...rel.split('/')), { force: true })
      result.deleted.push(rel)
    }
  }
  return result
}

function git(args: string[], cwd?: string, env?: NodeJS.ProcessEnv): { ok: boolean; out: string } {
  const run = spawnSync('git', args, { cwd, encoding: 'utf-8', env: { ...process.env, ...env } })
  return { ok: run.status === 0, out: `${run.stdout ?? ''}${run.stderr ?? ''}`.trim() }
}

function gitRoot(cwd: string): string {
  const root = git(['rev-parse', '--show-toplevel'], cwd)
  return root.ok ? root.out : cwd
}

export function sourceRepoName(cwd: string): string {
  const origin = git(['remote', 'get-url', 'origin'], cwd)
  if (!origin.ok) throw new Error(`[nimpress] view: ${cwd} has no origin remote, so its docs site mapping cannot be looked up`)
  return repoName(origin.out)
}

function ghInstalled(): boolean {
  return spawnSync('gh', ['--version'], { encoding: 'utf-8' }).status === 0
}

function loginEnv(login?: ViewLogin): NodeJS.ProcessEnv {
  if (login?.method === 'ssh' && login.key) return { GIT_SSH_COMMAND: `ssh -i ${login.key} -o IdentitiesOnly=yes` }
  return {}
}

function reachable(link: ViewLink): boolean {
  if (link.login?.method === 'gh') {
    return spawnSync('gh', ['repo', 'view', link.repo, '--json', 'name'], { encoding: 'utf-8' }).status === 0
  }
  return git(['ls-remote', '--exit-code', '-h', link.url], undefined, loginEnv(link.login)).ok
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

async function connect(link: ViewLink): Promise<ViewLink> {
  if (reachable(link)) return link
  console.log(`nimpress view: ${link.url} refused the connection`)
  if (ghInstalled()) {
    console.log('nimpress view: logging in through gh')
    const login = spawnSync('gh', ['auth', 'login'], { stdio: 'inherit' })
    if (login.status !== 0) throw new Error('[nimpress] view: gh auth login did not complete')
    const withGh = { ...link, login: { method: 'gh' as const } }
    if (reachable(withGh)) return withGh
    throw new Error(`[nimpress] view: ${link.repo} is still unreachable after the gh login, ask for access to it`)
  }
  const key = await ask('nimpress view: path to the ssh key with access to the repo: ')
  if (!key) throw new Error('[nimpress] view: no ssh key given and gh is not installed')
  const withKey = { ...link, login: { method: 'ssh' as const, key: resolve(key.replace(/^~/, homedir())) } }
  if (reachable(withKey)) return withKey
  throw new Error(`[nimpress] view: ${link.repo} is still unreachable with ${withKey.login.key}, ask for access to it`)
}

export async function resolveLinks(cwd: string, args: string[], home = homedir()): Promise<ViewLink[]> {
  const root = gitRoot(cwd)
  const config = readGlobalConfig(home)
  const stored = config.links[root] ?? []
  const traced = traceDocsSites(root)
  const named = flag(args, 'docs-repo')
  let links: ViewLink[]
  if (named) {
    const repo = repoName(named)
    const exportDir = traced.find((site) => site.repo === repo)?.exportDir ?? flag(args, 'export-dir') ?? '.nimpress'
    links = [{ repo, url: repoUrl(named), exportDir, login: stored.find((link) => link.repo === repo)?.login }]
  } else if (traced.length) {
    links = traced.map((site) => ({
      repo: site.repo,
      url: stored.find((link) => link.repo === site.repo)?.url ?? repoUrl(site.repo),
      exportDir: site.exportDir,
      login: stored.find((link) => link.repo === site.repo)?.login
    }))
  } else if (stored.length) {
    links = stored
  } else {
    console.log(`nimpress view: no workflow under ${root} names a docs site`)
    const answer = await ask('nimpress view: docs site repo, owner/repo or a url, http or ssh: ')
    if (!answer) throw new Error('[nimpress] view: no docs site given')
    links = [{ repo: repoName(answer), url: repoUrl(answer), exportDir: flag(args, 'export-dir') ?? '.nimpress' }]
  }
  const connected: ViewLink[] = []
  for (const link of links) connected.push(await connect(link))
  config.links[root] = connected
  writeGlobalConfig(config, home)
  return connected
}

export function siteDirFor(link: ViewLink, home = homedir()): string {
  return join(sitesDir(home), link.repo.replace('/', '__'))
}

function refresh(link: ViewLink, siteDir: string, offline: boolean): void {
  const env = loginEnv(link.login)
  if (!existsSync(join(siteDir, '.git'))) {
    mkdirSync(dirname(siteDir), { recursive: true })
    console.log(`nimpress view: cloning ${link.repo}`)
    const clone =
      link.login?.method === 'gh'
        ? spawnSync('gh', ['repo', 'clone', link.repo, siteDir, '--', '--depth', '1'], { encoding: 'utf-8' })
        : spawnSync('git', ['clone', '--depth', '1', link.url, siteDir], { encoding: 'utf-8', env: { ...process.env, ...env } })
    if (clone.status !== 0) throw new Error(`[nimpress] view: clone of ${link.repo} failed\n${clone.stderr ?? ''}`)
    return
  }
  if (offline) return
  const fetched = git(['fetch', '--depth', '1', 'origin', 'HEAD'], siteDir, env)
  if (!fetched.ok) throw new Error(`[nimpress] view: fetch of ${link.repo} failed\n${fetched.out}`)
  git(['reset', '--hard', 'FETCH_HEAD'], siteDir)
  git(['clean', '-fd'], siteDir)
}

function lockfileHash(siteDir: string): string {
  const lock = ['pnpm-lock.yaml', 'package.json'].map((name) => join(siteDir, name)).find((file) => existsSync(file))
  return lock ? createHash('sha256').update(readFileSync(lock)).digest('hex') : ''
}

function install(siteDir: string): void {
  const marker = join(siteDir, defaultConfig.paths.cache, 'view', 'lockfile.sha256')
  const hash = lockfileHash(siteDir)
  if (existsSync(join(siteDir, 'node_modules')) && existsSync(marker) && readFileSync(marker, 'utf-8').trim() === hash) return
  console.log('nimpress view: installing the docs site dependencies')
  const run = spawnSync('pnpm', ['install'], { cwd: siteDir, stdio: 'inherit' })
  if (run.status !== 0) throw new Error('[nimpress] view: pnpm install failed in the docs site clone')
  mkdirSync(dirname(marker), { recursive: true })
  writeFileSync(marker, `${hash}\n`)
}

function openBrowser(url: string): void {
  const os = platform()
  const command = os === 'darwin' ? ['open', url] : os === 'win32' ? ['cmd', '/c', 'start', '', url] : ['xdg-open', url]
  const child = spawn(command[0], command.slice(1), { stdio: 'ignore', detached: true })
  child.on('error', () => console.log(`nimpress view: open ${url} in a browser`))
  child.unref()
}

function debounce(run: () => void, ms: number): () => void {
  let timer: NodeJS.Timeout | undefined
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, ms)
  }
}

function report(label: string, result: { added: string[]; modified: string[]; deleted: string[] }): void {
  const total = result.added.length + result.modified.length + result.deleted.length
  if (total === 0) return
  console.log(`nimpress view: ${label} ${result.added.length} added, ${result.modified.length} modified, ${result.deleted.length} deleted`)
}

function serve(siteDir: string): { child: ReturnType<typeof spawn>; origin: Promise<string> } {
  const child = spawn('pnpm', ['exec', 'nimpress', 'dev'], { cwd: siteDir, stdio: ['ignore', 'pipe', 'inherit'] })
  const origin = new Promise<string>((resolveOrigin, reject) => {
    let found = false
    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      process.stdout.write(text)
      if (found) return
      const hit = text.replace(/\x1b\[[0-9;]*m/g, '').match(/Local\s*:?\s+(https?:\/\/\S+)/)
      if (hit) {
        found = true
        resolveOrigin(hit[1])
      }
    })
    child.on('exit', (code) => {
      if (!found) reject(new Error(`[nimpress] view: the docs site dev server exited with ${code ?? 'a signal'} before it printed a url`))
    })
    child.on('error', (err) => reject(new Error(`[nimpress] view: cannot run the docs site dev server, ${err.message}`)))
  })
  return { child, origin }
}

export async function runView(cwd: string, args: string[]): Promise<void> {
  const offline = hasFlag(args, 'offline')
  const links = await resolveLinks(cwd, args)
  const sourceRepo = sourceRepoName(cwd)
  const root = gitRoot(cwd)
  const local = await loadNimpressConfig(cwd)
  const exportArgs = flag(args, 'target') ? [`--target=${flag(args, 'target')}`] : []
  const closers: Array<() => void> = []

  for (const link of links) {
    const exportDir = resolve(root, link.exportDir)
    if (local.configFile) runExport(cwd, local.resolved, [...exportArgs, `--out=${exportDir}`])
    if (!existsSync(exportDir)) {
      throw new Error(`[nimpress] view: no export folder at ${exportDir}, write the pages there or mark pages with export: and add a config`)
    }
    const siteDir = siteDirFor(link)
    refresh(link, siteDir, offline)
    install(siteDir)
    const site = await loadNimpressConfig(siteDir)
    if (!site.configFile) throw new Error(`[nimpress] view: ${link.repo} carries no nimpress config, so it is not a docs site`)
    const receiver = traceReceiver(siteDir, site.resolved.contentDir)
    const targets = resolvedTargets(syncConfigFor(siteDir, receiver, sourceRepo))
    if (!targets.length) {
      throw new Error(
        `[nimpress] view: ${link.repo} has no target for ${sourceRepo}, add it to nimpress.sources.json or the receiver defaults`
      )
    }
    const contentRoot = resolve(siteDir, receiver.contentRoot)
    const sync = () => {
      for (const target of targets) {
        report(target.to, mirror(join(exportDir, ...target.from.split('/').filter(Boolean)), join(contentRoot, ...target.to.split('/')), target.mode))
      }
    }
    sync()
    const exportWatcher = watch(exportDir, { recursive: true }, debounce(sync, 150))
    closers.push(() => exportWatcher.close())
    if (local.configFile) {
      const contentWatcher = watch(
        resolve(cwd, local.resolved.contentDir),
        { recursive: true },
        debounce(() => runExport(cwd, local.resolved, [...exportArgs, `--out=${exportDir}`]), 150)
      )
      closers.push(() => contentWatcher.close())
    }

    const { child, origin } = serve(siteDir)
    closers.push(() => child.kill())
    const route = `${(await origin).replace(/\/$/, '')}/${targets[0].to}`
    console.log(`nimpress view: ${sourceRepo} inside ${link.repo} at ${route}`)
    if (!hasFlag(args, 'no-browser')) openBrowser(route)
  }

  const shutdown = () => {
    for (const close of closers) close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
