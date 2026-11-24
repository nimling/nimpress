import type MarkdownIt from 'markdown-it'
import type { FlattenedSpec } from './types'

function specResolveRef(spec: any, ref: string): unknown {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null
  const segments = ref.slice(2).split('/').map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
  let cursor: any = spec
  for (const seg of segments) {
    if (cursor == null) return null
    cursor = cursor[seg]
  }
  return cursor
}

function resolveStructural(value: any, spec: any, depth = 0): any {
  if (depth > 4) return value
  if (!value || typeof value !== 'object') return value
  if (typeof (value as any).$ref !== 'string') return value
  const target = specResolveRef(spec, (value as any).$ref)
  if (target == null) return value
  return resolveStructural(target, spec, depth + 1)
}

function renderMd(md: MarkdownIt, text: unknown): string | undefined {
  if (typeof text !== 'string' || text === '') return undefined
  try {
    return md.render(text)
  } catch {
    return undefined
  }
}

export function flattenSpecForEmbed(rawSpec: any, md: MarkdownIt): FlattenedSpec | null {
  if (!rawSpec) return null
  const spec = rawSpec
  const info = spec.info ?? {}
  const securitySchemes = spec.components?.securitySchemes ?? {}
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
  const exampleFromSchema = (schemaOrRef: any): unknown => {
    const resolved = resolveStructural(schemaOrRef, spec)
    return resolved?.example
  }

  interface FlatParam {
    name: string
    in: string
    required?: boolean
    schema?: unknown
    description?: string
    description_html?: string
    example?: unknown
  }

  interface FlatOp {
    id: string
    method: string
    path: string
    tag: string
    summary: string
    summary_html?: string
    description?: string
    description_html?: string
    parameters: FlatParam[]
    requestBody?: unknown
    requestBodyHtml?: string
    requestExample?: unknown
    responses?: Record<string, unknown>
    responseExamples?: Record<string, unknown>
    security?: unknown[]
    operationName?: string
  }

  const tagMap = new Map<string, FlatOp[]>()
  const paths = spec.paths ?? {}

  for (const [path, pathItemRaw] of Object.entries(paths) as [string, any][]) {
    const pathItem = resolveStructural(pathItemRaw, spec)
    if (!pathItem || typeof pathItem !== 'object') continue
    const inheritedParams = ((pathItem.parameters ?? []) as any[]).map((p) => resolveStructural(p, spec))
    for (const method of methods) {
      const op = pathItem[method]
      if (!op) continue
      const id = op.operationId ?? `${method}-${path.replace(/[^a-z0-9]+/gi, '-')}`
      const tag = op.tags?.[0] ?? 'default'
      const opParams = ((op.parameters ?? []) as any[]).map((p) => resolveStructural(p, spec))
      const merged = [...inheritedParams, ...opParams]
      const seenParams = new Set<string>()
      const parameters: FlatParam[] = []
      for (const raw of merged) {
        const p = raw as any
        if (!p || typeof p !== 'object') continue
        if (!p.name || !p.in) continue
        const key = `${p.name}@${p.in}`
        if (seenParams.has(key)) continue
        seenParams.add(key)
        parameters.push({
          name: p.name,
          in: p.in,
          required: p.required,
          schema: p.schema,
          description: p.description,
          description_html: renderMd(md, p.description),
          example: p.example ?? exampleFromSchema(p.schema)
        })
      }

      const reqBody = op.requestBody ? resolveStructural(op.requestBody, spec) : undefined
      const reqJson = reqBody?.content?.['application/json']
      const reqExample =
        reqJson?.example ??
        (reqJson?.examples ? Object.values(reqJson.examples as Record<string, any>)[0]?.value : undefined) ??
        exampleFromSchema(reqJson?.schema)

      const responseExamples: Record<string, unknown> = {}
      const responses: Record<string, any> = {}
      for (const [code, rRaw] of Object.entries(op.responses ?? {}) as [string, any][]) {
        const r = resolveStructural(rRaw, spec)
        responses[code] = r
        const rJson = r?.content?.['application/json']
        const ex =
          rJson?.example ??
          (rJson?.examples ? Object.values(rJson.examples as Record<string, any>)[0]?.value : undefined) ??
          exampleFromSchema(rJson?.schema)
        if (ex !== undefined) responseExamples[code] = ex
      }

      const flatOp: FlatOp = {
        id,
        method: method.toUpperCase(),
        path,
        tag,
        summary: op.summary ?? id,
        summary_html: renderMd(md, op.summary),
        description: op.description,
        description_html: renderMd(md, op.description),
        parameters,
        requestBody: reqBody,
        requestBodyHtml: renderMd(md, reqBody?.description),
        requestExample: reqExample,
        responses,
        responseExamples,
        security: op.security ?? spec.security,
        operationName: op.operationId
      }
      if (!tagMap.has(tag)) tagMap.set(tag, [])
      tagMap.get(tag)!.push(flatOp)
    }
  }

  const tags = [...tagMap.entries()]
    .map(([name, ops]) => ({ name, operations: ops }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const schemasRaw = spec.components?.schemas ?? {}
  const schemas: Record<string, any> = {}
  for (const [name, s] of Object.entries(schemasRaw) as [string, any][]) {
    const html = renderMd(md, s?.description)
    schemas[name] = html ? { ...s, description_html: html } : s
  }

  return {
    title: info.title ?? 'API',
    version: info.version ?? '',
    description: info.description,
    description_html: renderMd(md, info.description),
    servers: spec.servers,
    securitySchemes,
    tags,
    schemas
  }
}
