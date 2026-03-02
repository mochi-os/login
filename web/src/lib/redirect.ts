/** Validate a redirect URL is a safe relative path, not an open redirect. */
export function safeRedirect(url: string | undefined, fallback?: string): string {
  const defaultUrl = fallback || import.meta.env.VITE_DEFAULT_APP_URL || '/'
  if (!url || url.length === 0) return defaultUrl
  // Must start with / but not // (protocol-relative URL)
  if (url.startsWith('/') && !url.startsWith('//')) return url
  return defaultUrl
}
