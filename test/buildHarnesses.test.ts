import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildHarnesses } from '../src/cli/site'
import { file, makeRepo, resolvedConfig, type Repo } from './helpers'

let repo: Repo

afterEach(() => {
  repo?.cleanup()
  vi.restoreAllMocks()
})

describe('buildHarnesses', () => {
  it('skips a system that has no component pages yet', async () => {
    repo = makeRepo()
    file(repo.cwd, 'docs/index.md', '---\ntitle: Home\n---\n')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const config = resolvedConfig({
      modules: {
        dir: 'modules',
        route: '/_components',
        systems: { nimtech: { name: 'nimtech', framework: 'vue', package: '@nimling/components-nimtech' } }
      }
    })
    await expect(buildHarnesses(repo.cwd, config, ['nimtech'])).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith('nimpress modules: nimtech has no component pages, no harness built')
  })
})
