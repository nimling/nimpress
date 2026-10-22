import { spawn } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { NimpressCommandsConfig } from '../types'

export const commandRoute = '/__nimpress/command'

const loopbackAddresses = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

interface CommandRequest {
  command: string
  args: string[]
  stdin?: string
  stream: boolean
}

function wordPattern(word: string): RegExp {
  return new RegExp(`^${word.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`)
}

function entryMatches(entry: string, command: string, args: string[]): boolean {
  const [name, ...words] = entry.trim().split(/\s+/)
  if (name !== command) return false
  const rest = words[words.length - 1] === '**'
  const fixed = rest ? words.slice(0, -1) : words
  if (rest ? args.length < fixed.length : args.length !== fixed.length) return false
  return fixed.every((word, index) => wordPattern(word).test(args[index]))
}

export function getCommandRefusal(config: NimpressCommandsConfig, command: string, args: string[]): string | null {
  if (config.allow === 'all') return null
  if (config.allow === 'none') return 'commands are off, set commands.allow in nimpress.config to run one'
  if (config.allow.some((entry) => entryMatches(entry, command, args))) return null
  return `${[command, ...args].join(' ')} is not in commands.allow`
}

function hostIsLocal(host: string | undefined): boolean {
  if (!host) return false
  const name = host.replace(/:\d+$/, '').replace(/^\[|\]$/g, '')
  return name === 'localhost' || name.endsWith('.localhost') || name === '127.0.0.1' || name === '::1'
}

function requestIsLocal(req: IncomingMessage): boolean {
  if (!loopbackAddresses.includes(req.socket.remoteAddress ?? '')) return false
  if (!hostIsLocal(req.headers.host)) return false
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function parseRequest(raw: string): CommandRequest {
  const body = JSON.parse(raw) as Record<string, unknown>
  if (typeof body.command !== 'string' || !body.command) throw new Error('command is a non empty string')
  const args = body.args ?? []
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) throw new Error('args is an array of strings')
  if (body.stdin !== undefined && typeof body.stdin !== 'string') throw new Error('stdin is a string')
  return { command: body.command, args: args as string[], stdin: body.stdin as string | undefined, stream: body.stream === true }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function lineSplitter(emit: (line: string) => void): { push: (chunk: Buffer) => void; flush: () => void } {
  let pending = ''
  return {
    push(chunk) {
      const lines = (pending + chunk.toString('utf-8')).split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) emit(line)
    },
    flush() {
      if (pending) emit(pending)
      pending = ''
    }
  }
}

function runCommand(cwd: string, request: CommandRequest, res: ServerResponse): void {
  const child = spawn(request.command, request.args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
  let finished = false
  res.on('close', () => {
    if (finished) return
    finished = true
    child.kill('SIGTERM')
  })
  child.stdin.on('error', () => {})
  child.stdin.end(request.stdin ?? '')
  if (request.stream) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.flushHeaders()
    const write = (event: Record<string, unknown>) => {
      if (!res.destroyed) res.write(JSON.stringify(event) + '\n')
    }
    const stdout = lineSplitter((line) => write({ stream: 'stdout', line }))
    const stderr = lineSplitter((line) => write({ stream: 'stderr', line }))
    child.stdout.on('data', stdout.push)
    child.stderr.on('data', stderr.push)
    child.on('error', (err) => {
      if (finished) return
      finished = true
      write({ error: err.message })
      res.end()
    })
    child.on('close', (code) => {
      if (finished) return
      finished = true
      stdout.flush()
      stderr.flush()
      write({ code })
      res.end()
    })
    return
  }
  const stdout: Buffer[] = []
  const stderr: Buffer[] = []
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
  child.on('error', (err) => {
    if (finished) return
    finished = true
    sendJson(res, 502, { error: err.message })
  })
  child.on('close', (code) => {
    if (finished) return
    finished = true
    sendJson(res, 200, {
      data: { code, stdout: Buffer.concat(stdout).toString('utf-8'), stderr: Buffer.concat(stderr).toString('utf-8') }
    })
  })
}

export function getCommandHandler(config: NimpressCommandsConfig, cwd: string) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (!requestIsLocal(req)) {
      sendJson(res, 403, { error: 'commands answer only requests from localhost' })
      return
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      sendJson(res, 405, { error: `${commandRoute} takes POST` })
      return
    }
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      let request: CommandRequest
      try {
        request = parseRequest(Buffer.concat(chunks).toString('utf-8'))
      } catch (err) {
        sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) })
        return
      }
      const refusal = getCommandRefusal(config, request.command, request.args)
      if (refusal) {
        sendJson(res, 403, { error: refusal })
        return
      }
      runCommand(cwd, request, res)
    })
  }
}
