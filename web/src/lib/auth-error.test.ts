// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/* eslint-disable lingui/no-unlocalized-strings */

import { describe, expect, it } from 'vitest'
import { authErrorCode } from './auth-error'

// The shape requestHelpers throws: an Error carrying the server's body on
// .data. Built by hand rather than imported so the test does not pull the
// whole @mochi/web barrel in for one class.
class Refusal extends Error {
  status: number
  data: unknown
  constructor(status: number, data: unknown) {
    super('refused')
    this.status = status
    this.data = data
  }
}

describe('authErrorCode', () => {
  it('reads the code from the body an ApiError carries on .data', () => {
    expect(authErrorCode(new Refusal(403, { error: 'suspended', message: 'Suspended' })))
      .toBe('suspended')
    expect(authErrorCode(new Refusal(400, { error: 'session_expired', message: 'x' })))
      .toBe('session_expired')
  })

  it('does not read the raw-axios .response.data shape', () => {
    // This is the shape the catch blocks used to read, which an ApiError never
    // has - reading it left every code-specific branch dead.
    expect(authErrorCode({ response: { data: { error: 'suspended' } } })).toBeUndefined()
  })

  it('answers undefined for anything that is not a coded refusal', () => {
    expect(authErrorCode(undefined)).toBeUndefined()
    expect(authErrorCode(null)).toBeUndefined()
    expect(authErrorCode(new Error('network'))).toBeUndefined()
    expect(authErrorCode(new Refusal(500, 'not json'))).toBeUndefined()
    expect(authErrorCode(new Refusal(400, { error: 7 }))).toBeUndefined()
    expect(authErrorCode(new Refusal(400, { message: 'no code' }))).toBeUndefined()
  })
})
