import type { FlatOperation, SecurityScheme } from './types'

export interface TryState {
  selectedScheme: string
  authValue: string
  serverUrl: string
  pathValues: Record<string, string>
  queryValues: Record<string, string>
  headerValues: Record<string, string>
  bodyValue: string
}

export function createTryState(op: FlatOperation, initialServer: string, schemes: Record<string, SecurityScheme>): TryState {
  const schemeNames = Object.keys(schemes ?? {})
  return {
    selectedScheme: schemeNames[0] ?? '',
    authValue: '',
    serverUrl: initialServer,
    pathValues: {},
    queryValues: {},
    headerValues: {},
    bodyValue:
      op.requestExample !== undefined ? JSON.stringify(op.requestExample, null, 2) : ''
  }
}

export function fillPath(op: FlatOperation, state: TryState): string {
  let p = op.path
  for (const param of op.parameters.filter((x) => x.in === 'path')) {
    const v = state.pathValues[param.name] ?? ''
    p = p.replace(`{${param.name}}`, encodeURIComponent(v))
  }
  return p
}

export function buildUrl(op: FlatOperation, state: TryState): string {
  const base = (state.serverUrl || '').replace(/\/$/, '')
  const path = fillPath(op, state)
  const usp = new URLSearchParams()
  for (const param of op.parameters.filter((x) => x.in === 'query')) {
    const v = state.queryValues[param.name]
    if (v !== undefined && v !== '') usp.set(param.name, v)
  }
  const q = usp.toString()
  return `${base}${path}${q ? '?' + q : ''}`
}

export function buildAuthHeader(state: TryState, schemes: Record<string, SecurityScheme>): { key: string; value: string } | null {
  if (!state.selectedScheme || !state.authValue) return null
  const scheme = schemes[state.selectedScheme]
  if (!scheme) return null
  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return { key: 'Authorization', value: `Bearer ${state.authValue}` }
  }
  if (scheme.type === 'http' && scheme.scheme === 'basic') {
    return { key: 'Authorization', value: `Basic ${state.authValue}` }
  }
  if (scheme.type === 'apiKey' && scheme.in === 'header' && scheme.name) {
    return { key: scheme.name, value: state.authValue }
  }
  return { key: 'Authorization', value: state.authValue }
}

export function buildHeaders(op: FlatOperation, state: TryState, schemes: Record<string, SecurityScheme>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const param of op.parameters.filter((x) => x.in === 'header')) {
    const v = state.headerValues[param.name]
    if (v) out[param.name] = v
  }
  const auth = buildAuthHeader(state, schemes)
  if (auth) out[auth.key] = auth.value
  if (state.bodyValue && ['POST', 'PUT', 'PATCH'].includes(op.method)) {
    out['Content-Type'] = out['Content-Type'] ?? 'application/json'
  }
  return out
}

export function hasBody(op: FlatOperation, state: TryState): boolean {
  return !!state.bodyValue && ['POST', 'PUT', 'PATCH'].includes(op.method)
}
