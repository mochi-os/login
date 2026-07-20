// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

/** Validate a redirect URL is a safe same-origin path, not an open redirect. */
export function safeRedirect(url: string | undefined, fallback?: string): string {
  const defaultUrl = fallback || import.meta.env.VITE_DEFAULT_APP_URL || '/'
  if (!url || url.length === 0) return defaultUrl
  // Resolve against our own origin and compare — a string prefix check on
  // '/' vs '//' is not enough, because the browser normalises backslashes and
  // control characters ('/\evil.com', '/\t/evil.com') into a protocol-relative
  // URL when the result is later assigned to window.location. Anything that
  // resolves to a different origin (including javascript:/data: and userinfo
  // tricks) falls back to the default.
  try {
    const resolved = new URL(url, window.location.origin)
    if (resolved.origin !== window.location.origin) return defaultUrl
    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return defaultUrl
  }
}
