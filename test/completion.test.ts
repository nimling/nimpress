import { describe, expect, it } from 'vitest'
import { launcherScript, managedBlock } from '../src/cli/completion'

describe('launcherScript', () => {
  it('prefers the pinned bin and falls back to dlx in bash and zsh', () => {
    const script = launcherScript('zsh')
    expect(script).toContain('nimpress() {')
    expect(script).toContain('node_modules/.bin/nimpress "$@"')
    expect(script).toContain('pnpm --silent --package=@nimtech/nimpress dlx nimpress "$@"')
    expect(launcherScript('bash')).toBe(script)
  })

  it('writes a fish function with the same order', () => {
    const script = launcherScript('fish')
    expect(script).toContain('function nimpress')
    expect(script.indexOf('node_modules/.bin/nimpress $argv')).toBeLessThan(script.indexOf('dlx nimpress $argv'))
  })

  it('lands inside the managed block and rewrites it in place', () => {
    const once = managedBlock('export A=1\n', `${launcherScript('zsh')}\nfpath=(x $fpath)`)
    const twice = managedBlock(once, `${launcherScript('zsh')}\nfpath=(x $fpath)`)
    expect(twice).toBe(once)
    expect(once.startsWith('export A=1\n# >>> nimpress completion >>>\nnimpress() {')).toBe(true)
  })
})
