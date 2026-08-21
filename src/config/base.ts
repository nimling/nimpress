export function normalizeBase(value: string | undefined): string {
  const raw = String(value ?? '/').trim()
  if (!raw || raw === '/') return '/'
  const withLead = raw.startsWith('/') ? raw : `/${raw}`
  return withLead.endsWith('/') ? withLead : `${withLead}/`
}

export function joinBase(base: string, path: string): string {
  const prefix = normalizeBase(base)
  if (prefix === '/' || !path.startsWith('/') || path.startsWith('//')) return path
  if (path === prefix.slice(0, -1) || path.startsWith(prefix)) return path
  return prefix.slice(0, -1) + path
}

export function stripBase(base: string, path: string): string {
  const prefix = normalizeBase(base)
  if (prefix === '/') return path
  if (path === prefix.slice(0, -1)) return '/'
  if (!path.startsWith(prefix)) return path
  return '/' + path.slice(prefix.length)
}
