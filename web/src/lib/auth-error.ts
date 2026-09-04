// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

// The code a refused auth request carries. requestHelpers rejects with
// ApiError, which holds the server's JSON body on .data: {"error": code,
// "message": text} as respond_error writes it. The raw-axios shape,
// error.response.data, belongs only to plain-axios calls such as
// signupRestore and is deliberately not read here: for an ApiError it is
// always undefined, which is how the code-specific branches went dead.
export function authErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const data = (error as { data?: unknown }).data
  if (!data || typeof data !== 'object') return undefined
  const code = (data as { error?: unknown }).error
  return typeof code === 'string' ? code : undefined
}
