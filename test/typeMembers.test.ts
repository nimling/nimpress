import { describe, expect, it } from 'vitest'
import { controlFromJsonSchema, opaqueControls, type ControlJsonSchema } from '../src/modules/parse/typeMembers'

function nest(levels: number): ControlJsonSchema {
  let node: ControlJsonSchema = { type: 'string', description: 'leaf' }
  for (let i = 0; i < levels; i++) {
    node = { type: 'object', description: `level ${i}`, properties: { child: node } }
  }
  return node
}

const entry: ControlJsonSchema = {
  type: 'object',
  description: 'One entry rendered on the lane.',
  properties: {
    id: { type: 'string', description: 'Unique entry id.' },
    schedule: {
      type: 'array',
      tsType: 'Schedule[]',
      description: 'Recurrence schedule carrying the entry time windows.',
      items: {
        type: 'object',
        description: 'One recurrence schedule window.',
        properties: {
          id: { type: 'string', description: 'Schedule identity.' },
          pattern: { type: 'object', additionalProperties: {}, description: 'Recurrence pattern.' }
        }
      }
    },
    style: {
      type: 'object',
      description: 'Style block of the entry.',
      properties: {
        colors: {
          type: 'object',
          description: 'Colors of the entry.',
          properties: { primary: { type: 'string', description: 'Primary color.' } }
        }
      }
    }
  }
}

const laneTree: ControlJsonSchema = {
  type: 'array',
  description: 'Lane groups rendered on the timeline.',
  items: {
    type: 'object',
    description: 'One lane group.',
    properties: {
      lanes: {
        type: 'array',
        description: 'Lanes of the group.',
        items: {
          type: 'object',
          description: 'One lane.',
          properties: {
            entries: { type: 'array', tsType: 'NimcalEntry[]', description: 'Entries of the lane.', items: entry }
          }
        }
      }
    }
  }
}

describe('controlFromJsonSchema', () => {
  it('expands an authored lane tree deep enough that no member reads as opaque', () => {
    const spec = controlFromJsonSchema('data', laneTree)
    expect(opaqueControls([spec])).toEqual([])
  })

  it('reaches the entry style colors nested six levels under the array root', () => {
    const spec = controlFromJsonSchema('data', laneTree)
    const group = spec.item
    const lanes = group?.members?.find((m) => m.name === 'lanes')
    const lane = lanes?.item
    const entries = lane?.members?.find((m) => m.name === 'entries')
    const style = entries?.item?.members?.find((m) => m.name === 'style')
    const colors = style?.members?.find((m) => m.name === 'colors')
    expect(colors?.kind).toBe('object')
    expect(colors?.members?.map((m) => m.name)).toEqual(['primary'])
  })

  it('stops expanding past the depth bound', () => {
    const shallow = controlFromJsonSchema('root', nest(12))
    expect(shallow.kind).toBe('object')
    const deep = controlFromJsonSchema('root', nest(13))
    let node = deep
    while (node.members?.length) node = node.members[0]
    expect(node.kind).toBe('json')
    expect(node.type).toBe('object')
  })
})
