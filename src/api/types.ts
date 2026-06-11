export interface FlatParameter {
  name: string
  in: string
  required?: boolean
  schema?: unknown
  description?: string
  description_html?: string
  example?: unknown
}

export interface FlatOperation {
  id: string
  method: string
  path: string
  tag: string
  summary: string
  summary_html?: string
  description?: string
  description_html?: string
  parameters: FlatParameter[]
  requestBody?: unknown
  requestBodyHtml?: string
  requestExample?: unknown
  responses?: Record<string, unknown>
  responseExamples?: Record<string, unknown>
  security?: unknown[]
  operationName?: string
}

export interface FlatSchema {
  type?: string
  description?: string
  description_html?: string
  properties?: Record<string, unknown>
  items?: unknown
  required?: string[]
  example?: unknown
}

export interface FlatServer {
  url: string
  description?: string
}

export interface SecurityScheme {
  type?: string
  scheme?: string
  bearerFormat?: string
  in?: string
  name?: string
  description?: string
}

export interface FlattenedSpec {
  title: string
  version: string
  description?: string
  description_html?: string
  servers?: FlatServer[]
  securitySchemes: Record<string, SecurityScheme>
  tags: { name: string; operations: FlatOperation[] }[]
  schemas: Record<string, FlatSchema>
}

export function isFlattenedSpec(value: unknown): value is FlattenedSpec {
  return !!value && typeof value === 'object' && Array.isArray((value as FlattenedSpec).tags)
}
