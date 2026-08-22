import { describe, expect, it } from 'vitest'
import { compareVersions } from '../src/plugin'

const sorted = (versions: string[]) => versions.slice().sort((a, b) => compareVersions(b, a))

describe('compareVersions', () => {
  it('orders release versions by numeric segment', () => {
    expect(sorted(['1.2.9', '1.10.0', '2.0.0', '1.2.10'])).toEqual([
      '2.0.0',
      '1.10.0',
      '1.2.10',
      '1.2.9'
    ])
  })

  it('tolerates a leading v and build metadata', () => {
    expect(compareVersions('v1.4.2', '1.4.2+build.7')).toBe(0)
    expect(compareVersions('v2.0.0', 'v1.9.9')).toBeGreaterThan(0)
  })

  it('ranks a release above its own prereleases', () => {
    expect(compareVersions('1.0.0', '1.0.0-alpha0175')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0-rc.1', '1.0.0')).toBeLessThan(0)
  })

  it('orders zero padded prerelease counters by their number', () => {
    expect(sorted(['1.0.0-alpha0099', '1.0.0-alpha0175', '1.0.0-alpha0100'])).toEqual([
      '1.0.0-alpha0175',
      '1.0.0-alpha0100',
      '1.0.0-alpha0099'
    ])
  })

  it('orders unpadded prerelease counters by their number', () => {
    expect(compareVersions('1.0.0-alpha176', '1.0.0-alpha99')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0-rc.10', '1.0.0-rc.2')).toBeGreaterThan(0)
  })

  it('ranks a longer prerelease above its prefix', () => {
    expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0)
  })
})
