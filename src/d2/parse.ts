import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'

export class D2Error extends Error {
  files: string[]

  constructor(message: string, files: string[] = []) {
    super(message)
    this.files = files
  }
}

export interface D2Node {
  id: string
  path: string[]
  parent: string
  label: string | null
  attrs: Record<string, string>
  classes: string[]
  order: number
}

export interface D2Connection {
  source: string
  target: string
  sourceArrow: boolean
  targetArrow: boolean
  label: string
  attrs: Record<string, string>
  classes: string[]
  scope: string
  order: number
}

export interface D2Graph {
  nodes: Map<string, D2Node>
  connections: D2Connection[]
  classes: Map<string, { label: string | null; attrs: Record<string, string> }>
  files: string[]
}

type D2Value =
  | { kind: 'string'; text: string }
  | { kind: 'null' }
  | { kind: 'array'; items: string[] }
  | { kind: 'import'; path: string }

interface D2Statement {
  line: number
  keys: string[][]
  ops: string[]
  value?: D2Value
  map?: D2Statement[]
  spread?: string
  edgeRef?: { index: string; attr: string[] }
}

const OPERATORS = ['<->', '->', '<-', '--']

const RESERVED = new Set([
  'label',
  'shape',
  'style',
  'icon',
  'tooltip',
  'link',
  'near',
  'width',
  'height',
  'direction',
  'constraint',
  'class',
  'classes',
  'vars',
  'source-arrowhead',
  'target-arrowhead',
  'grid-rows',
  'grid-columns',
  'grid-gap',
  'vertical-gap',
  'horizontal-gap',
  'layers',
  'scenarios',
  'steps'
])

const IGNORED_BLOCKS = new Set(['layers', 'scenarios', 'steps'])

const KEY_STOP = new Set(['.', ':', ';', '{', '}', '\n', '#'])

const MAX_IMPORT_DEPTH = 16

class Scanner {
  pos = 0
  grouped = false

  constructor(
    readonly text: string,
    readonly file: string
  ) {}

  peek(offset = 0): string {
    return this.text[this.pos + offset] ?? ''
  }

  eof(): boolean {
    return this.pos >= this.text.length
  }

  startsWith(token: string): boolean {
    return this.text.startsWith(token, this.pos)
  }

  line(): number {
    let count = 1
    for (let i = 0; i < this.pos && i < this.text.length; i++) if (this.text[i] === '\n') count++
    return count
  }

  fail(message: string): never {
    throw new D2Error(`${this.file}:${this.line()}: ${message}`)
  }

  skipInline(): void {
    while (this.peek() === ' ' || this.peek() === '\t' || this.peek() === '\r') this.pos++
  }

  skipComment(): void {
    if (this.startsWith('"""')) {
      const end = this.text.indexOf('"""', this.pos + 3)
      this.pos = end < 0 ? this.text.length : end + 3
      return
    }
    while (!this.eof() && this.peek() !== '\n') this.pos++
  }

  skipBlank(): void {
    for (;;) {
      const c = this.peek()
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === ';') this.pos++
      else if (c === '#' || this.startsWith('"""')) this.skipComment()
      else return
    }
  }

  operator(): string {
    for (const op of OPERATORS) {
      if (this.startsWith(op)) {
        this.pos += op.length
        return op
      }
    }
    return ''
  }

  atOperator(): boolean {
    return OPERATORS.some((op) => this.startsWith(op))
  }
}

function readQuoted(s: Scanner): string {
  const quote = s.peek()
  s.pos++
  let out = ''
  while (!s.eof() && s.peek() !== quote) {
    if (s.peek() === '\n') s.fail('unterminated string')
    if (s.peek() === '\\') {
      const next = s.peek(1)
      out += next === 'n' ? '\n' : next === 't' ? '\t' : next
      s.pos += 2
      continue
    }
    out += s.peek()
    s.pos++
  }
  if (s.eof()) s.fail('unterminated string')
  s.pos++
  return out
}

function dedent(text: string): string {
  const lines = text.replace(/^\s*\n/, '').replace(/\n\s*$/, '').split('\n')
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => /^\s*/.exec(l)![0].length))
  return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join('\n')
}

function readBlockString(s: Scanner): string {
  const open = /^\|+`*/.exec(s.text.slice(s.pos))![0]
  s.pos += open.length
  while (/[\w-]/.test(s.peek())) s.pos++
  const close = open.split('').reverse().join('')
  const end = s.text.indexOf(close, s.pos)
  if (end < 0) s.fail('unterminated block string')
  const body = s.text.slice(s.pos, end)
  s.pos = end + close.length
  return dedent(body)
}

function readKeySegment(s: Scanner): string {
  s.skipInline()
  if (s.peek() === '"' || s.peek() === "'") return readQuoted(s)
  let out = ''
  while (!s.eof() && !KEY_STOP.has(s.peek()) && !s.atOperator() && !(s.grouped && s.peek() === ')')) {
    if (s.peek() === '\\' && s.peek(1)) s.pos++
    out += s.peek()
    s.pos++
  }
  const key = out.trim()
  if (!key) s.fail(`expected a key, found ${JSON.stringify(s.peek() || 'end of file')}`)
  return key
}

function readKeyPath(s: Scanner): string[] {
  const path = [readKeySegment(s)]
  for (;;) {
    s.skipInline()
    if (s.peek() !== '.') return path
    s.pos++
    path.push(readKeySegment(s))
  }
}

function readChain(s: Scanner, statement: D2Statement): void {
  statement.keys.push(readKeyPath(s))
  for (;;) {
    s.skipInline()
    const op = s.operator()
    if (!op) return
    statement.ops.push(op)
    statement.keys.push(readKeyPath(s))
  }
}

function readArray(s: Scanner): string[] {
  s.pos++
  const items: string[] = []
  for (;;) {
    while (/[\s;,]/.test(s.peek())) s.pos++
    if (s.eof()) s.fail('unterminated array')
    if (s.peek() === ']') {
      s.pos++
      return items
    }
    if (s.peek() === '"' || s.peek() === "'") {
      items.push(readQuoted(s))
      continue
    }
    let item = ''
    while (!s.eof() && !/[;,\]\n]/.test(s.peek())) {
      item += s.peek()
      s.pos++
    }
    if (item.trim()) items.push(item.trim())
  }
}

function readValue(s: Scanner): D2Value | undefined {
  s.skipInline()
  const c = s.peek()
  if (c === '{' || c === '' || c === '\n' || c === ';' || c === '}') return undefined
  if (c === '"' || c === "'") return { kind: 'string', text: readQuoted(s) }
  if (c === '|') return { kind: 'string', text: readBlockString(s) }
  if (c === '[') return { kind: 'array', items: readArray(s) }
  let raw = ''
  while (!s.eof() && !/[\n;{}#]/.test(s.peek())) {
    if (s.startsWith('${')) {
      const close = s.text.indexOf('}', s.pos)
      if (close > 0 && !s.text.slice(s.pos, close).includes('\n')) {
        raw += s.text.slice(s.pos, close + 1)
        s.pos = close + 1
        continue
      }
    }
    raw += s.peek()
    s.pos++
  }
  const text = raw.trim()
  if (text.startsWith('@')) return { kind: 'import', path: text.slice(1).trim() }
  if (text === 'null') return { kind: 'null' }
  return { kind: 'string', text }
}

function readBlock(s: Scanner): D2Statement[] {
  s.pos++
  const items = readStatements(s, true)
  if (s.peek() !== '}') s.fail('expected }')
  s.pos++
  return items
}

function endStatement(s: Scanner): void {
  s.skipInline()
  if (s.peek() === '#') s.skipComment()
  const c = s.peek()
  if (c === '' || c === '\n' || c === ';' || c === '}') return
  s.fail(`unexpected ${JSON.stringify(c)}`)
}

function readStatement(s: Scanner): D2Statement {
  const statement: D2Statement = { line: s.line(), keys: [], ops: [] }
  if (s.startsWith('...@')) {
    s.pos += 4
    let raw = ''
    while (!s.eof() && !/[\n;}#]/.test(s.peek())) {
      raw += s.peek()
      s.pos++
    }
    statement.spread = raw.trim()
    endStatement(s)
    return statement
  }
  if (s.peek() === '(') {
    s.pos++
    s.grouped = true
    readChain(s, statement)
    s.grouped = false
    s.skipInline()
    if (s.peek() !== ')') s.fail('expected ) after the connection')
    s.pos++
    if (s.peek() !== '[') s.fail('expected [index] after the connection')
    const close = s.text.indexOf(']', s.pos)
    if (close < 0) s.fail('expected ]')
    const index = s.text.slice(s.pos + 1, close).trim()
    s.pos = close + 1
    let attr: string[] = []
    if (s.peek() === '.') {
      s.pos++
      attr = readKeyPath(s)
    }
    statement.edgeRef = { index, attr }
  } else {
    readChain(s, statement)
  }
  s.skipInline()
  if (s.peek() === ':') {
    s.pos++
    statement.value = readValue(s)
    s.skipInline()
  }
  if (s.peek() === '{') statement.map = readBlock(s)
  endStatement(s)
  return statement
}

function readStatements(s: Scanner, nested: boolean): D2Statement[] {
  const items: D2Statement[] = []
  for (;;) {
    s.skipBlank()
    if (s.eof()) {
      if (nested) s.fail('expected }')
      return items
    }
    if (s.peek() === '}') {
      if (!nested) s.fail('unexpected }')
      return items
    }
    items.push(readStatement(s))
  }
}

function splitAttr(path: string[]): { node: string[]; attr: string[] } {
  const at = path.findIndex((segment) => RESERVED.has(segment))
  if (at < 0) return { node: path, attr: [] }
  return { node: path.slice(0, at), attr: path.slice(at) }
}

class Builder {
  nodes = new Map<string, D2Node>()
  connections: D2Connection[] = []
  classes = new Map<string, { label: string | null; attrs: Record<string, string> }>()
  vars = new Map<string, string>()
  files: string[] = []
  order = 0

  constructor() {
    this.nodes.set('', { id: '', path: [], parent: '', label: null, attrs: {}, classes: [], order: -1 })
  }

  fail(file: string, line: number, message: string): never {
    throw new D2Error(`${file}:${line}: ${message}`)
  }

  text(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (whole, name: string) => this.vars.get(name.trim()) ?? whole)
  }

  resolvePath(scope: string[], path: string[], file: string, line: number): string[] {
    const out = [...scope]
    for (const segment of path) {
      if (segment === '_') {
        if (!out.length) this.fail(file, line, 'the _ reference reaches above the root')
        out.pop()
      } else {
        out.push(segment)
      }
    }
    return out
  }

  ensure(path: string[]): D2Node {
    let parent = ''
    for (let i = 1; i <= path.length; i++) {
      const id = path.slice(0, i).join('.')
      if (!this.nodes.has(id)) {
        this.nodes.set(id, { id, path: path.slice(0, i), parent, label: null, attrs: {}, classes: [], order: this.order++ })
      }
      parent = id
    }
    return this.nodes.get(path.join('.'))!
  }

  remove(id: string): void {
    for (const key of [...this.nodes.keys()]) {
      if (key === id || key.startsWith(`${id}.`)) this.nodes.delete(key)
    }
    this.connections = this.connections.filter(
      (c) => !(c.source === id || c.source.startsWith(`${id}.`) || c.target === id || c.target.startsWith(`${id}.`))
    )
  }

  importFile(ref: string, file: string, line: number, depth: number): { items: D2Statement[]; file: string } {
    const target = resolve(dirname(file), ref.endsWith('.d2') ? ref : `${ref}.d2`)
    this.files.push(target)
    if (depth >= MAX_IMPORT_DEPTH) this.fail(file, line, `imports nest deeper than ${MAX_IMPORT_DEPTH}`)
    if (!existsSync(target)) this.fail(file, line, `failed to import ${JSON.stringify(ref)}: file does not exist`)
    const scanner = new Scanner(readFileSync(target, 'utf-8'), basename(target))
    return { items: readStatements(scanner, false), file: target }
  }

  setAttrs(
    target: { label: string | null; attrs: Record<string, string>; classes: string[] },
    attr: string[],
    statement: D2Statement,
    file: string
  ): void {
    const key = attr.join('.')
    const value = statement.value
    if (value?.kind === 'string' || value?.kind === 'array') {
      const text = value.kind === 'string' ? this.text(value.text) : value.items.map((item) => this.text(item)).join(';')
      if (key === 'label') target.label = text
      else if (key === 'class') target.classes = value.kind === 'array' ? value.items : [text]
      else if (key === 'source-arrowhead' || key === 'target-arrowhead') target.attrs[`${key}.label`] = text
      else target.attrs[key] = text
    }
    if (value?.kind === 'import') this.fail(file, statement.line, `an import cannot be the value of ${key}`)
    for (const child of statement.map ?? []) {
      if (child.keys.length !== 1) this.fail(file, child.line, `${key} takes attributes, not connections`)
      this.setAttrs(target, [...attr, ...child.keys[0]], child, file)
    }
  }

  setVars(prefix: string[], items: D2Statement[]): void {
    for (const item of items) {
      const path = [...prefix, ...item.keys[0]]
      if (item.value?.kind === 'string') this.vars.set(path.join('.'), this.text(item.value.text))
      if (item.map) this.setVars(path, item.map)
    }
  }

  setClasses(items: D2Statement[], file: string): void {
    for (const item of items) {
      const name = item.keys[0].join('.')
      const entry = this.classes.get(name) ?? { label: null, attrs: {} }
      const holder = { label: entry.label, attrs: entry.attrs, classes: [] as string[] }
      for (const child of item.map ?? []) this.setAttrs(holder, child.keys[0], child, file)
      this.classes.set(name, { label: holder.label, attrs: holder.attrs })
    }
  }

  connect(statement: D2Statement, scope: string[], file: string): D2Connection[] {
    const ends = statement.keys.map((key) => {
      const path = this.resolvePath(scope, key, file, statement.line)
      if (splitAttr(path.slice(scope.length)).attr.length) this.fail(file, statement.line, `a connection cannot end in the keyword ${key.join('.')}`)
      return this.ensure(path).id
    })
    const made: D2Connection[] = []
    statement.ops.forEach((op, i) => {
      const reverse = op === '<-'
      const connection: D2Connection = {
        source: reverse ? ends[i + 1] : ends[i],
        target: reverse ? ends[i] : ends[i + 1],
        sourceArrow: op === '<->',
        targetArrow: op !== '--',
        label: '',
        attrs: {},
        classes: [],
        scope: scope.join('.'),
        order: this.order++
      }
      this.connections.push(connection)
      made.push(connection)
    })
    return made
  }

  run(items: D2Statement[], scope: string[], file: string, depth: number): void {
    for (const statement of items) this.statement(statement, scope, file, depth)
  }

  statement(statement: D2Statement, scope: string[], file: string, depth: number): void {
    if (statement.spread !== undefined) {
      const imported = this.importFile(statement.spread, file, statement.line, depth)
      this.run(imported.items, scope, imported.file, depth + 1)
      return
    }
    if (statement.edgeRef) {
      const ends = statement.keys.map((key) => this.resolvePath(scope, key, file, statement.line).join('.'))
      const { index, attr } = statement.edgeRef
      statement.ops.forEach((op, i) => {
        const [source, target] = op === '<-' ? [ends[i + 1], ends[i]] : [ends[i], ends[i + 1]]
        const matches = this.connections.filter((c) => c.source === source && c.target === target)
        const picked = index === '*' ? matches : matches.slice(Number(index), Number(index) + 1)
        if (!picked.length) this.fail(file, statement.line, `no connection ${source} ${op} ${target} at index ${index}`)
        for (const connection of picked) this.setAttrs(connection, attr, statement, file)
      })
      return
    }
    if (statement.keys.length > 1) {
      for (const connection of this.connect(statement, scope, file)) {
        if (statement.value?.kind === 'string') connection.label = this.text(statement.value.text)
        for (const child of statement.map ?? []) {
          if (child.keys.length !== 1) this.fail(file, child.line, 'a connection block takes attributes, not connections')
          this.setAttrs(connection, child.keys[0], child, file)
        }
      }
      return
    }
    const key = statement.keys[0]
    const { node, attr } = splitAttr(key)
    if (attr[0] === 'vars') {
      this.setVars([], statement.map ?? [])
      return
    }
    if (attr[0] === 'classes') {
      this.setClasses(statement.map ?? [], file)
      return
    }
    if (IGNORED_BLOCKS.has(attr[0])) return
    const path = this.resolvePath(scope, node, file, statement.line)
    if (attr.length) {
      this.setAttrs(path.length ? this.ensure(path) : this.nodes.get('')!, attr, statement, file)
      return
    }
    if (statement.value?.kind === 'null') {
      this.remove(path.join('.'))
      return
    }
    const target = this.ensure(path)
    if (statement.value?.kind === 'string') target.label = this.text(statement.value.text)
    if (statement.value?.kind === 'array') target.label = statement.value.items.join(', ')
    if (statement.value?.kind === 'import') {
      const imported = this.importFile(statement.value.path, file, statement.line, depth)
      this.run(imported.items, path, imported.file, depth + 1)
    }
    if (statement.map) this.run(statement.map, path, file, depth)
  }
}

export function parseD2(source: string, file: string): D2Graph {
  const builder = new Builder()
  try {
    const items = readStatements(new Scanner(source, basename(file)), false)
    builder.run(items, [], file, 0)
  } catch (err) {
    if (err instanceof D2Error) throw new D2Error(err.message, builder.files)
    throw err
  }
  return { nodes: builder.nodes, connections: builder.connections, classes: builder.classes, files: builder.files }
}
