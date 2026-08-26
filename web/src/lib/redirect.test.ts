// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */

import { describe, expect, it } from 'vitest'
import { navigable, safeRedirect } from './redirect'

describe('navigable', () => {
  it('accepts the provider URLs an OAuth begin legitimately returns', () => {
    expect(navigable('https://accounts.google.com/o/oauth2/v2/auth?x=1')).toBe(true)
    expect(navigable('http://localhost:8081/_/auth/oauth/github/callback')).toBe(true)
  })

  it('refuses schemes that execute rather than navigate', () => {
    // The whole point: login runs in the top window with the session cookie,
    // so window.location.href = 'javascript:...' would run script there.
    expect(navigable('javascript:fetch("/_/token")')).toBe(false)
    expect(navigable('JavaScript:alert(1)')).toBe(false)
    expect(navigable('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(navigable('blob:https://example.com/abc')).toBe(false)
    expect(navigable('vbscript:msgbox')).toBe(false)
  })

  it('refuses an empty, relative or unparseable value', () => {
    // Not resolved against our origin: '' would otherwise read as the current
    // page and reload it, and a relative path is never what a begin returns.
    expect(navigable('')).toBe(false)
    expect(navigable('   ')).toBe(false)
    expect(navigable('/login/')).toBe(false)
    expect(navigable('//accounts.google.com/x')).toBe(false)
  })
})

describe('safeRedirect', () => {
  it('keeps a same-origin path', () => {
    expect(safeRedirect('/feeds/')).toBe('/feeds/')
    expect(safeRedirect('/wikis/x?a=1#b')).toBe('/wikis/x?a=1#b')
  })

  it('falls back for off-origin and protocol-relative values', () => {
    expect(safeRedirect('https://evil.example/x', '/')).toBe('/')
    expect(safeRedirect('//evil.example/x', '/')).toBe('/')
    expect(safeRedirect('/\\evil.example', '/')).toBe('/')
  })
})
