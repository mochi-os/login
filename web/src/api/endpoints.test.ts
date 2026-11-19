// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { describe, expect, it } from 'vitest'
import endpoints from './endpoints'

const begin = endpoints.auth.oauth.begin

describe('endpoints.auth.oauth.begin', () => {
  it.each(['github', 'mastodon', 'x'])(
    'builds the same path for %s',
    (provider) => {
      expect(begin(provider)).toBe(`/_/auth/oauth/${provider}/begin`)
    }
  )

  it.each(['../delete', 'a/b', '.', '..', ''])('refuses %j', (provider) => {
    expect(() => begin(provider)).toThrow(/path: refused/)
  })

  it('keeps a query inside its segment', () => {
    expect(begin('x?y=1')).toBe('/_/auth/oauth/x%3Fy%3D1/begin')
  })
})
