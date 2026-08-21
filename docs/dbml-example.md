---
title: Schema viewer
type: dbml
spec: ./dbml-example.dbml
order: 11
sidebar:
  name: Authoring
description: A live type dbml page showing a trimmed booking schema.
data:
  eyebrow: Database
  lead: Pan by dragging empty canvas, zoom with the wheel, and drag a table to move it.
  download: Download the schema
  fullscreen: Open fullscreen
---

The `booking.answers` column holds a `jsonb` payload. Its shape is drawn as the `booking_answers` table and the column links to it, so clicking the column moves the canvas there. The `booking.source` column links to a page instead.
