const endpoints = {
  auth: {
    begin: '/_/auth/begin',
    code: '/_/auth/code',
    verify: '/_/auth/verify',
    totpLogin: '/_/auth/totp',
    methods: '/_/auth/methods',
    identity: '/_/identity',
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
} as const

export default endpoints
