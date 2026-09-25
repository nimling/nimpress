import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { commands, type CompletionCommand, type CompletionFlag } from './completion'

interface McpTool {
  name: string
  argv: string[]
  describe: string
  flags: CompletionFlag[]
  serves: boolean
}

interface McpRequest {
  jsonrpc: '2.0'
  id?: number | string
  method: string
  params?: Record<string, unknown>
}

interface McpInput {
  cwd?: string
  args?: string[]
  flags?: Record<string, string | boolean>
}

interface McpResult {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

const outsideMcp = new Set(['skill', 'plugin', 'mcp', 'completion'])

const servingCommands = new Set(['dev', 'view', 'modules dev'])

const servingSettleMs = 20000

const served = new Map<number, ChildProcess>()

function toolsOf(command: CompletionCommand, parents: string[]): McpTool[] {
  const argv = [...parents, command.name]
  if (command.subs.length) return command.subs.flatMap((sub) => toolsOf(sub, argv))
  return [
    {
      name: argv.join('_'),
      argv,
      describe: command.describe,
      flags: command.flags,
      serves: servingCommands.has(argv.join(' '))
    }
  ]
}

const tools: McpTool[] = commands.filter((command) => !outsideMcp.has(command.name)).flatMap((command) => toolsOf(command, []))

function packageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const candidate of [resolve(here, '..', 'package.json'), resolve(here, '..', '..', 'package.json')]) {
    try {
      return JSON.parse(readFileSync(candidate, 'utf-8')).version
    } catch {}
  }
  return '0.0.0'
}

function inputSchema(tool: McpTool): Record<string, unknown> {
  const flags: Record<string, unknown> = {}
  for (const entry of tool.flags) {
    flags[entry.name.slice(2)] = { type: entry.value ? 'string' : 'boolean', description: entry.describe }
  }
  return {
    type: 'object',
    properties: {
      cwd: { type: 'string', description: 'the site root the command runs in, relative to the project root, the project root by default' },
      args: { type: 'array', items: { type: 'string' }, description: 'positional arguments, such as a component name or a file' },
      flags: { type: 'object', properties: flags, additionalProperties: false }
    },
    additionalProperties: false
  }
}

function toolList(): Record<string, unknown>[] {
  return [
    ...tools.map((tool) => ({
      name: tool.name,
      description: `nimpress ${tool.argv.join(' ')}: ${tool.describe}${tool.serves ? '. Keeps running in the background and returns its pid with the first output' : ''}`,
      inputSchema: inputSchema(tool)
    })),
    {
      name: 'stop',
      description: 'Stop a server a dev, view, or modules dev tool started, by its pid',
      inputSchema: {
        type: 'object',
        properties: { pid: { type: 'number', description: 'the pid the serving tool returned' } },
        required: ['pid'],
        additionalProperties: false
      }
    }
  ]
}

function argvOf(tool: McpTool, input: McpInput): string[] {
  const argv = [...tool.argv, ...(input.args ?? [])]
  for (const [name, value] of Object.entries(input.flags ?? {})) {
    if (value === true) argv.push(`--${name}`)
    else if (typeof value === 'string') argv.push(`--${name}=${value}`)
  }
  return argv
}

function text(value: string, isError = false): McpResult {
  return { content: [{ type: 'text', text: value || '(no output)' }], ...(isError ? { isError } : {}) }
}

function spawnCli(root: string, tool: McpTool, input: McpInput): ChildProcess {
  return spawn(process.execPath, [process.argv[1], ...argvOf(tool, input)], {
    cwd: resolve(root, input.cwd ?? '.'),
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

function runTool(root: string, tool: McpTool, input: McpInput): Promise<McpResult> {
  const child = spawnCli(root, tool, input)
  let output = ''
  child.stdout?.on('data', (chunk) => (output += chunk))
  child.stderr?.on('data', (chunk) => (output += chunk))
  return new Promise((done) => {
    child.on('error', (err) => done(text(`${output}${err.message}`, true)))
    child.on('close', (code) => done(text(output, code !== 0)))
  })
}

function serveTool(root: string, tool: McpTool, input: McpInput): Promise<McpResult> {
  const child = spawnCli(root, tool, input)
  let output = ''
  return new Promise((done) => {
    const settle = (result: McpResult) => {
      clearTimeout(timer)
      child.stdout?.removeAllListeners('data')
      child.stderr?.removeAllListeners('data')
      child.stdout?.resume()
      child.stderr?.resume()
      done(result)
    }
    const collect = (chunk: Buffer) => {
      output += chunk
      if (/https?:\/\/\S+/.test(output)) settle(text(`pid ${child.pid}\n${output}`))
    }
    const timer = setTimeout(() => settle(text(`pid ${child.pid}\n${output}`)), servingSettleMs)
    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)
    child.on('error', (err) => settle(text(`${output}${err.message}`, true)))
    child.on('exit', (code) => {
      served.delete(child.pid ?? -1)
      settle(text(output, code !== 0))
    })
    if (child.pid) served.set(child.pid, child)
  })
}

function stopTool(pid: number): McpResult {
  const child = served.get(pid)
  if (!child) return text(`no server with pid ${pid} was started by this session`, true)
  child.kill('SIGTERM')
  served.delete(pid)
  return text(`stopped ${pid}`)
}

async function callTool(root: string, params: Record<string, unknown>): Promise<McpResult> {
  const name = String(params.name ?? '')
  const input = (params.arguments ?? {}) as McpInput & { pid?: number }
  if (name === 'stop') return stopTool(Number(input.pid))
  const tool = tools.find((candidate) => candidate.name === name)
  if (!tool) return text(`unknown tool ${name}`, true)
  if (!existsSync(resolve(root, input.cwd ?? '.'))) return text(`no folder ${input.cwd} under ${root}`, true)
  return tool.serves ? serveTool(root, tool, input) : runTool(root, tool, input)
}

function reply(id: McpRequest['id'] | null, body: { result: unknown } | { error: { code: number; message: string } }): void {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, ...body }) + '\n')
}

async function answer(root: string, request: McpRequest): Promise<void> {
  if (request.id === undefined) return
  if (request.method === 'initialize') {
    reply(request.id, {
      result: {
        protocolVersion: request.params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'nimpress', version: packageVersion() }
      }
    })
    return
  }
  if (request.method === 'ping') {
    reply(request.id, { result: {} })
    return
  }
  if (request.method === 'tools/list') {
    reply(request.id, { result: { tools: toolList() } })
    return
  }
  if (request.method === 'tools/call') {
    reply(request.id, { result: await callTool(root, request.params ?? {}) })
    return
  }
  reply(request.id, { error: { code: -32601, message: `method not found: ${request.method}` } })
}

export function runMcp(cwd: string): void {
  const lines = createInterface({ input: process.stdin })
  const pending = new Set<Promise<void>>()
  lines.on('line', (line) => {
    if (!line.trim()) return
    let request: McpRequest
    try {
      request = JSON.parse(line)
    } catch {
      reply(null, { error: { code: -32700, message: 'parse error' } })
      return
    }
    const answering = answer(cwd, request)
      .catch((err) => reply(request.id, { error: { code: -32603, message: String(err?.message ?? err) } }))
      .finally(() => pending.delete(answering))
    pending.add(answering)
  })
  lines.on('close', async () => {
    await Promise.all(pending)
    for (const child of served.values()) child.kill('SIGTERM')
    process.exit(0)
  })
}
