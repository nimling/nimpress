import { describe, expect, it } from 'vitest'
import { dbmlToDiagram, type ErdTable } from '../src/dbml/erd'

const schema = `
Table organization {
  id uuid [pk]
  name varchar(120) [not null]
  Note: 'Tenant root'
}

Table location {
  id uuid [pk]
  organization_id uuid [not null]
  settings jsonb [note: 'Location settings, shaped by [location_settings](location_settings)']
  handbook varchar(120) [note: 'Described in the [handbook](/guide/locations)']

  indexes {
    (organization_id, id) [unique, name: 'ux_location_org']
  }
}

Table location_settings {
  key varchar(60) [not null]
  value text [not null]
  Note: 'The shape inside location.settings'
}

Table booking {
  id uuid [pk]
  location_id uuid [not null]
}

Note site_note {
  'A standalone note lands beside the tables'
}

Ref: location.organization_id > organization.id
Ref: booking.location_id > location.id
`

function boxes(tables: ErdTable[]) {
  return tables.map((t) => ({ id: t.id, x: t.x, y: t.y, w: t.width, h: t.height }))
}

describe('dbmlToDiagram', () => {
  it('places every table and note without overlapping', () => {
    const diagram = dbmlToDiagram(schema)
    const all = [...boxes(diagram.tables), ...diagram.notes.map((n) => ({ id: n.id, x: n.x, y: n.y, w: n.width, h: n.height }))]
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]
        const b = all[j]
        const hit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(hit, `${a.id} overlaps ${b.id}`).toBe(false)
      }
    }
  })

  it('gives every note a measured height', () => {
    const diagram = dbmlToDiagram(schema)
    expect(diagram.notes.length).toBe(1)
    expect(diagram.notes[0].height).toBeGreaterThan(0)
  })

  it('turns a note link naming a table into a canvas target', () => {
    const diagram = dbmlToDiagram(schema)
    const location = diagram.tables.find((t) => t.name === 'location')!
    const settings = diagram.tables.find((t) => t.name === 'location_settings')!
    const column = location.columns.find((c) => c.name === 'settings')!
    expect(column.target).toBe(settings.id)
    expect(column.link).toBe('')
    expect(column.linkLabel).toBe('location_settings')
    expect(column.note).toBe('Location settings, shaped by')
  })

  it('keeps a note link naming a path as a page link', () => {
    const diagram = dbmlToDiagram(schema)
    const location = diagram.tables.find((t) => t.name === 'location')!
    const column = location.columns.find((c) => c.name === 'handbook')!
    expect(column.link).toBe('/guide/locations')
    expect(column.target).toBe('')
    expect(column.linkLabel).toBe('handbook')
  })

  it('points a foreign key column at the table it references', () => {
    const diagram = dbmlToDiagram(schema)
    const booking = diagram.tables.find((t) => t.name === 'booking')!
    const location = diagram.tables.find((t) => t.name === 'location')!
    const column = booking.columns.find((c) => c.name === 'location_id')!
    expect(column.fk).toBe(true)
    expect(column.target).toBe(location.id)
  })
})
