const endpoints = {
  auth: {
    code: '/_/auth/code',
    verify: '/_/auth/verify',
    methods: '/_/auth/methods',
    mfa: '/_/auth/mfa',
    identity: '/login/identity/create',
    logout: '/login/logout',
    passkey: {
      loginBegin: '/_/auth/passkey/begin',
      loginFinish: '/_/auth/passkey/finish',
      list: '/login/passkey/list',
      count: '/login/passkey/count',
      registerBegin: '/login/passkey/register/begin',
      registerFinish: '/login/passkey/register/finish',
      rename: '/login/passkey/rename',
      delete: '/login/passkey/delete',
    },
    totp: {
      setup: '/login/totp/setup',
      verify: '/login/totp/verify',
      enabled: '/login/totp/enabled',
      disable: '/login/totp/disable',
    },
    recovery: {
      login: '/_/auth/recovery',
      generate: '/login/recovery/generate',
      count: '/login/recovery/count',
    },
    userMethods: {
      get: '/login/methods/get',
      set: '/login/methods/set',
    },
  },
} as const

export type Endpoints = typeof endpoints

export default endpoints
