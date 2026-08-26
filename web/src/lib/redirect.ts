// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { getRouterBasepath } from '@mochi/web'

/** Absolute URL inside this app for full-page navigations. When served at the root (anonymous
 * default app) use the canonical /login/ prefix: a bare '/identity' would
 * derive 'identity' as
 * the app prefix. */
export const appUrl = (path: string): string => {
  const base = getRouterBasepath()
  return (base === '/' ? '/login/' : base) + path
}

/** Whether a URL may be handed to a full-page navigation. Off-origin is fine —
 * an OAuth provider is the point — but the scheme must be one that navigates.
 * `javascript:` assigned to window.location.href executes, and this app is the
 * one core exempts from the shell sandbox, so that runs in the top window with
 * the session cookie. */
export function navigable(url: string): boolean {
  try {
    // Parsed with no base, so a relative or empty value is refused rather than
    // resolving against our own origin - what this guards is an absolute URL
    // the server handed back, and nothing else belongs here.
    const scheme = new URL(url).protocol
    return scheme === 'https:' || scheme === 'http:'
  } catch {
    return false
  }
}

/** Validate a redirect URL is a safe same-origin path, not an open redirect. */
export function safeRedirect(url: string | undefined, fallback?: string): string {
  const defaultUrl = fallback || import.meta.env.VITE_DEFAULT_APP_URL || '/'
  if (!url || url.length === 0) return defaultUrl
  // Resolve against our origin rather than prefix-checking '/': browsers
  // normalise '/\evil.com' and '/\t/evil.com' into protocol-relative URLs.
  try {
    const resolved = new URL(url, window.location.origin)
    if (resolved.origin !== window.location.origin) return defaultUrl
    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return defaultUrl
  }
}
