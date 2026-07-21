// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

const endpoints = {
  auth: {
    begin: '/_/auth/begin',
    code: '/_/auth/code',
    verify: '/_/auth/verify',
    totpLogin: '/_/auth/totp',
    methods: '/_/auth/methods',
    partial: '/_/auth/partial',
    identity: '/_/identity',
    abandon: '/_/abandon',
    restore: '/_/auth/restore',
    passkey: {
      loginBegin: '/_/auth/passkey/begin',
      loginFinish: '/_/auth/passkey/finish',
    },
    recovery: {
      login: '/_/auth/recovery',
    },
    oauth: {
      begin: (provider: string) => `/_/auth/oauth/${provider}/begin`,
    },
  },
  document: {
    get: '-/document/get',
  },
} as const

export default endpoints
