// Copyright © 2026 Mochi OÜ
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
    replicate: '/_/auth/replicate',
    restore: '/_/auth/restore',
    passkey: {
      loginBegin: '/_/auth/passkey/begin',
      loginFinish: '/_/auth/passkey/finish',
      list: '-/passkey/list',
      count: '-/passkey/count',
      registerBegin: '-/passkey/register/begin',
      registerFinish: '-/passkey/register/finish',
      rename: '-/passkey/rename',
      delete: '-/passkey/delete',
    },
    totp: {
      setup: '-/totp/setup',
      verify: '-/totp/verify',
      enabled: '-/totp/enabled',
      disable: '-/totp/disable',
    },
    recovery: {
      login: '/_/auth/recovery',
      generate: '-/recovery/generate',
      count: '-/recovery/count',
    },
    userMethods: {
      get: '-/methods/get',
      set: '-/methods/set',
    },
    oauth: {
      begin: (provider: string) => `/_/auth/oauth/${provider}/begin`,
      list: '-/oauth/list',
      unlink: '-/oauth/unlink',
    },
  },
  document: {
    get: '-/document/get',
  },
} as const

export default endpoints
