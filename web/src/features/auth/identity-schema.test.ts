// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */

import { describe, expect, it } from 'vitest'
import { identitySchema } from './identity-schema'

const schema = identitySchema({
  short: 'short',
  long: 'long',
  characters: 'characters',
})

// Which message a value produces, or null when the schema accepts it.
function problem(name: string): string | null {
  const result = schema.safeParse({ name, privacy: 'public' })
  return result.success ? null : (result.error.issues[0]?.message ?? 'unknown')
}

describe('identitySchema name', () => {
  it('accepts ordinary names', () => {
    expect(problem('Jo')).toBe(null)
    expect(problem('José Álvarez-Núñez')).toBe(null)
    expect(problem('北京の人')).toBe(null)
    expect(problem('a'.repeat(1000))).toBe(null)
  })

  it('refuses a name below the minimum', () => {
    expect(problem('J')).toBe('short')
  })

  it('refuses a name past core’s 1000-character limit', () => {
    expect(problem('a'.repeat(1001))).toBe('long')
  })

  it('refuses the characters core’s "name" pattern excludes', () => {
    expect(problem('a<b')).toBe('characters')
    expect(problem('a>b')).toBe('characters')
    expect(problem('a\nb')).toBe('characters')
    expect(problem('a\rb')).toBe('characters')
  })
})
