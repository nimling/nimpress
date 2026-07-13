import type { AuthConfig, AuthFunctions, OidcEndpoints, RelyingParty, Viewer } from '../types'

let config: AuthConfig | null = null
let discovered: Promise<OidcEndpoints> | null = null

export function configureAuth(next: AuthConfig | undefined): void {
  config = next && next.issuer && next.clientId ? next : null
  discovered = null
}

export function authConfigured(): boolean {
  if (!config) return false
  return Boolean(config.functions?.resolveViewer || config.functions?.startLogin || (config.issuer && config.clientId))
}

function functions(): AuthFunctions {
  return config?.functions ?? {}
}

function mergedHeaders(): Record<string, string> {
  return { ...(config?.headers ?? {}) }
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname + window.location.search
}

function mapViewer(raw: Record<string, unknown> | null | undefined): Viewer {
  if (!raw) return { authenticated: false }
  const r = raw as Record<string, string>
  return {
    authenticated: true,
    id: r.id ?? r.sub,
    firstName: r.firstName ?? r.given_name,
    lastName: r.lastName ?? r.family_name,
    userName: r.userName ?? r.preferred_username,
    phone: r.phone ?? r.phone_number,
    email: r.email,
    location: r.location,
    type: r.type as Viewer['type']
  }
}

async function endpoints(): Promise<OidcEndpoints> {
  if (!config) return {}
  if (discovered) return discovered
  const explicit = config.endpoints ?? {}
  const base = config.issuer.replace(/\/$/, '')
  const discoveryUrl = explicit.discovery ?? base + '/.well-known/openid-configuration'
  discovered = (async () => {
    let meta: Record<string, string> = {}
    for (const url of [discoveryUrl, base + '/.well-known/oauth-authorization-server']) {
      try {
        const res = await fetch(url, { headers: mergedHeaders() })
        if (res.ok) {
          meta = (await res.json()) as Record<string, string>
          break
        }
      } catch {}
    }
    return {
      discovery: discoveryUrl,
      authorization: explicit.authorization ?? meta.authorization_endpoint,
      token: explicit.token ?? meta.token_endpoint,
      userinfo: explicit.userinfo ?? meta.userinfo_endpoint,
      endSession: explicit.endSession ?? meta.end_session_endpoint,
      jwks: explicit.jwks ?? meta.jwks_uri
    }
  })()
  return discovered
}

async function relyingParty(): Promise<RelyingParty> {
  const eps = await endpoints()
  const clientId = config!.clientId
  const scopes = config!.scopes ?? 'openid profile email'
  const redirectPath = config!.redirectPath ?? '/auth/callback'
  const headers = mergedHeaders()
  return {
    clientId,
    scopes,
    redirectPath,
    headers,
    endpoints: eps,
    mapViewer,
    authorizeUrl: async (returnTo: string) => {
      if (!eps.authorization) return ''
      const redirectUri =
        typeof window !== 'undefined' ? window.location.origin + redirectPath : redirectPath
      const url = new URL(eps.authorization)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('client_id', clientId)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('scope', scopes)
      url.searchParams.set('next', returnTo)
      return url.toString()
    }
  }
}

export async function resolveViewer(): Promise<Viewer> {
  if (!config) return { authenticated: false }
  const rp = await relyingParty()
  if (functions().resolveViewer) {
    const user = await functions().resolveViewer!(rp)
    return user ? { ...user, authenticated: true } : { authenticated: false }
  }
  if (!rp.endpoints.userinfo) return { authenticated: false }
  try {
    const res = await fetch(rp.endpoints.userinfo, { credentials: 'include', headers: rp.headers })
    if (!res.ok) return { authenticated: false }
    const body = (await res.json()) as { data?: Record<string, unknown> } | Record<string, unknown>
    const data = (body as { data?: Record<string, unknown> }).data ?? body
    return mapViewer(data as Record<string, unknown>)
  } catch {
    return { authenticated: false }
  }
}

export function startLogin(returnTo?: string): void {
  if (!config) return
  const target = returnTo ?? currentPath()
  void relyingParty().then(async (rp) => {
    if (functions().startLogin) {
      await functions().startLogin!(rp, target)
      return
    }
    const url = await rp.authorizeUrl(target)
    if (url && typeof window !== 'undefined') window.location.href = url
  })
}

export function handleUnauthenticated(returnTo?: string): void {
  startLogin(returnTo ?? currentPath())
}

export async function endSession(returnTo?: string): Promise<void> {
  if (!config) return
  const target = returnTo ?? currentPath()
  const rp = await relyingParty()
  if (functions().endSession) {
    await functions().endSession!(rp, target)
    return
  }
  if (rp.endpoints.endSession && typeof window !== 'undefined') {
    const url = new URL(rp.endpoints.endSession)
    url.searchParams.set('next', target)
    window.location.href = url.toString()
  }
}
