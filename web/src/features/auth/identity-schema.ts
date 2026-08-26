// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { z } from 'zod'

/** Mirrors core's "name" pattern (^[^<>\r\n]{1,1000}$, utilities.go), so a name
 * the server will refuse is reported on the field instead of arriving as a
 * generic submit failure. Messages are passed in so the schema itself stays
 * free of the Lingui macro and can be exercised directly. */
export const identitySchema = (messages: {
  short: string
  long: string
  characters: string
}) =>
  z.object({
    name: z
      .string()
      .min(2, messages.short)
      .max(1000, messages.long)
      .regex(/^[^<>\r\n]+$/, messages.characters),
    privacy: z.enum(['public', 'private']),
  })
