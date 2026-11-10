// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// The consent page's calls: what another app asks, and the user's answer.
import { requestHelpers, useAuthStore } from '@mochi/web'

// The consent actions act as the signed-in user, so each call carries the
// app token core requires. lib/web's store mints it and requestHelpers sends
// it; the login app's own store, which its other pages use, holds none.
let minted: Promise<void> | null = null
const token = () => (minted ??= useAuthStore.getState().initialize())

export interface ConsentAccount {
  id: string
  identifier: string
  name: string
  // The home feed posts made from apps land in, where one has been chosen.
  home: string
  // Whether the client named this account when it asked.
  hinted: boolean
}

export interface ConsentRequest {
  id: string
  client: { id: string; name: string; website: string }
  network: string
  scope: string
  scopes: string[]
  // Whether the client asks to post, follow or otherwise write as the account.
  writes: boolean
  hint: string
  accounts: ConsentAccount[]
}

export interface ConsentFeed {
  id: string
  name: string
}

export interface ConsentData {
  request: ConsentRequest
  feeds: ConsentFeed[]
}

export const consentApi = {
  request: async (id: string) => {
    await token()
    return requestHelpers.get<ConsentData>('-/oauth/consent/request', {
      params: { request: id },
    })
  },
  approve: async (data: {
    request: string
    account: string
    feed?: string
    create?: boolean
  }) => {
    await token()
    return requestHelpers.post<{ url: string }>('-/oauth/consent/approve', {
      request: data.request,
      account: data.account,
      feed: data.feed ?? '',
      create: data.create ? 'true' : '',
    })
  },
  refuse: async (id: string) => {
    await token()
    return requestHelpers.post<{ url: string }>('-/oauth/consent/refuse', {
      request: id,
    })
  },
}
