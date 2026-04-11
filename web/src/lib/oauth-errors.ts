// Maps an oauth_error query code from the server-side callback to a toast
// message. Defined in one place so the login page, auth settings page, and any
// future caller all render the same strings.

const providerLabel = (provider?: string): string => {
  if (!provider) return 'the provider'
  switch (provider) {
    case 'github':
      return 'GitHub'
    case 'google':
      return 'Google'
    case 'microsoft':
      return 'Microsoft'
    case 'facebook':
      return 'Facebook'
    case 'x':
      return 'X'
    default:
      return provider
  }
}

export function oauthErrorMessage(code: string, provider?: string): string {
  switch (code) {
    case 'access_denied':
      return 'Sign-in cancelled'
    case 'signup_disabled':
      return 'New accounts are disabled on this server'
    case 'email_exists':
      return `An account with that email already exists. Sign in first, then link ${providerLabel(provider)} from your auth settings.`
    case 'email_unverified':
      return `Your ${providerLabel(provider)} email is not verified`
    case 'oauth_disallowed':
      return 'Your account requires a passkey to sign in'
    case 'already_linked':
      return `That ${providerLabel(provider)} account is already linked to another user`
    case 'state_invalid':
      return 'Login session expired, please try again'
    case 'suspended':
      return 'Your account has been suspended'
    case 'unknown_provider':
      return 'That sign-in provider is not available'
    case 'provider_error':
    default:
      return 'Sign-in failed, please try again'
  }
}
