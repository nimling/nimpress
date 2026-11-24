import { mount } from 'svelte'
import MarkdownIt from 'markdown-it'
import { parse } from 'yaml'
import '../styles/tokens.css'
import '../styles/preflight.css'
import OpenApiRoot from './OpenApiRoot.svelte'
import { flattenSpecForEmbed } from './flatten'
import { applyInitialTheme } from '../framework/stores/theme'

export default async function NimpressApi({ url, target }: { url: string; target: string | HTMLElement }) {
  const element = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!element) throw new Error(`NimpressApi: no element matches ${String(target)}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`NimpressApi: ${url} answered ${res.status} ${res.statusText}`)
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false
  })
  const spec = flattenSpecForEmbed(parse(await res.text()), md)
  applyInitialTheme()
  return mount(OpenApiRoot, {
    target: element,
    props: {
      spec,
      specFile: new URL(url, window.location.href).pathname.split('/').pop(),
      specUrl: url
    }
  })
}
