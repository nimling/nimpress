import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { commandRoute, getCommandHandler, getCommandRefusal } from '../src/commands/server'
import { postCommand } from '../src/commands/index'
import type { NimpressCommandsConfig } from '../src/types'

let server: Server | null = null

afterEach(() => {
  server?.close()
  server = null
  vi.unstubAllGlobals()
})

async function serve(config: NimpressCommandsConfig): Promise<string> {
  const handler = getCommandHandler(config, process.cwd())
  server = createServer((req, res) => {
    if (req.url === commandRoute) return handler(req, res)
    res.statusCode = 404
    res.end()
  })
  await new Promise<void>((done) => server!.listen(0, '127.0.0.1', done))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const realFetch = globalThis.fetch
  vi.stubGlobal('fetch', (input: string, init?: RequestInit) => realFetch(origin + input, init))
  return origin
}

describe('getCommandRefusal', () => {
  it('refuses every command when allow is none', () => {
    expect(getCommandRefusal({ allow: 'none' }, 'git', ['status'])).toMatch(/commands are off/)
  })

  it('runs every command when allow is all', () => {
    expect(getCommandRefusal({ allow: 'all' }, 'rm', ['-rf', 'x'])).toBeNull()
  })

  it('matches a list word by word with * inside one argument and a trailing ** for the rest', () => {
    const config: NimpressCommandsConfig = { allow: ['git status', 'git log **', 'claude -p --model *'] }
    expect(getCommandRefusal(config, 'git', ['status'])).toBeNull()
    expect(getCommandRefusal(config, 'git', ['status', '--short'])).toBe('git status --short is not in commands.allow')
    expect(getCommandRefusal(config, 'git', ['log'])).toBeNull()
    expect(getCommandRefusal(config, 'git', ['log', '--oneline', '-5'])).toBeNull()
    expect(getCommandRefusal(config, 'git', ['push'])).not.toBeNull()
    expect(getCommandRefusal(config, 'claude', ['-p', '--model', 'haiku'])).toBeNull()
    expect(getCommandRefusal(config, 'claude', ['-p', '--model', 'haiku', '--tools', 'Bash'])).not.toBeNull()
    expect(getCommandRefusal(config, 'gitx', ['status'])).not.toBeNull()
  })
})

describe('postCommand', () => {
  it('calls a command with stdin and returns its output and exit code', async () => {
    await serve({ allow: ['cat'] })
    const result = await postCommand('cat', { stdin: 'hello\nworld' })
    expect(result).toEqual({ code: 0, stdout: 'hello\nworld', stderr: '' })
  })

  it('listens to every line of stdout and stderr and resolves with the exit code', async () => {
    await serve({ allow: ['node -e *'] })
    const lines: string[] = []
    const result = await postCommand('node', {
      args: ['-e', 'console.log("one"); console.error("two"); console.log("three"); process.exit(3)'],
      onLine: (line, stream) => lines.push(`${stream}:${line}`)
    })
    expect(lines.filter((line) => line.startsWith('stdout:'))).toEqual(['stdout:one', 'stdout:three'])
    expect(lines).toContain('stderr:two')
    expect(result.code).toBe(3)
    expect(result.stdout).toBe('one\nthree\n')
  })

  it('throws the refusal for a command outside the allow list', async () => {
    await serve({ allow: ['git status'] })
    await expect(postCommand('git', { args: ['push'] })).rejects.toThrow('git push is not in commands.allow')
  })

  it('throws the spawn error for a command that does not exist', async () => {
    await serve({ allow: 'all' })
    await expect(postCommand('nimpress-no-such-command')).rejects.toThrow(/ENOENT/)
  })

  it('refuses a request from another origin', async () => {
    await serve({ allow: 'all' })
    const res = await fetch(commandRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' },
      body: JSON.stringify({ command: 'echo', args: ['x'] })
    })
    expect(res.status).toBe(403)
    expect(((await res.json()) as { error: string }).error).toBe('commands answer only requests from localhost')
  })
})
