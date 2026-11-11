// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  steps: [] as string[],
  initialize: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@mochi/web', () => ({
  useAuthStore: { getState: () => ({ initialize: state.initialize }) },
  requestHelpers: { get: state.get, post: state.post },
}))

describe('consentApi', () => {
  beforeEach(() => {
    vi.resetModules()
    state.steps = []
    state.initialize.mockReset().mockImplementation(async () => {
      await Promise.resolve()
      state.steps.push('token')
    })
    state.get.mockReset().mockImplementation(async (path: string) => {
      state.steps.push(path)
      return {}
    })
    state.post.mockReset().mockImplementation(async (path: string) => {
      state.steps.push(path)
      return { url: '' }
    })
  })

  // The consent actions refuse a signed-in browser's call without an app
  // token; the login app's own store mints none, so every call came back 403.
  it('mints the app token before it asks for the request', async () => {
    const { consentApi } = await import('./consent')
    await consentApi.request('r1')
    expect(state.steps).toEqual(['token', '-/oauth/consent/request'])
  })

  it('mints it once for every call the page makes', async () => {
    const { consentApi } = await import('./consent')
    await consentApi.request('r1')
    await consentApi.approve({ request: 'r1', account: 'a1' })
    await consentApi.refuse('r1')
    expect(state.initialize).toHaveBeenCalledTimes(1)
    expect(state.steps).toEqual([
      'token',
      '-/oauth/consent/request',
      '-/oauth/consent/approve',
      '-/oauth/consent/refuse',
    ])
  })
})
