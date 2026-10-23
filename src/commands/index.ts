export type CommandStream = 'stdout' | 'stderr'

export interface CommandOptions {
  args?: string[]
  stdin?: string
  onLine?: (line: string, stream: CommandStream) => void
  signal?: AbortSignal
}

export interface CommandResult {
  code: number | null
  stdout: string
  stderr: string
}

interface CommandEvent {
  stream?: CommandStream
  line?: string
  code?: number | null
  error?: string
}

const commandRoute = '/__nimpress/command'

export const commandsEnabled: boolean = true

async function refusal(res: Response): Promise<Error> {
  if (res.status === 404) return new Error('commands run only under nimpress dev, a built site has no command server')
  const text = await res.text()
  try {
    return new Error(String((JSON.parse(text) as CommandEvent).error ?? `command request returned ${res.status}`))
  } catch {
    return new Error(`command request returned ${res.status}`)
  }
}

async function readEvents(res: Response, onLine: (line: string, stream: CommandStream) => void): Promise<CommandResult> {
  const result: CommandResult = { code: null, stdout: '', stderr: '' }
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader()
  let pending = ''
  const take = (raw: string) => {
    if (!raw) return
    const event = JSON.parse(raw) as CommandEvent
    if (event.error !== undefined) throw new Error(event.error)
    if (event.stream && event.line !== undefined) {
      result[event.stream] += event.line + '\n'
      onLine(event.line, event.stream)
      return
    }
    if ('code' in event) result.code = event.code ?? null
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = (pending + value).split('\n')
    pending = lines.pop() ?? ''
    for (const line of lines) take(line)
  }
  take(pending)
  return result
}

export async function postCommand(command: string, options: CommandOptions = {}): Promise<CommandResult> {
  const res = await fetch(commandRoute, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args: options.args ?? [], stdin: options.stdin, stream: Boolean(options.onLine) }),
    signal: options.signal
  })
  if (!res.ok) throw await refusal(res)
  if (options.onLine) return readEvents(res, options.onLine)
  return ((await res.json()) as { data: CommandResult }).data
}
