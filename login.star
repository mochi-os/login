# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Login app - authentication UI
# Unauthenticated login is handled by core at /_/auth/*. Account management
# (passkeys, TOTP, recovery codes, OAuth links, method preferences) lives in the
# settings app; this app only serves the login SPA and the public document
# endpoint below.

def action_document_get(a):
    """Public: return one of the server documents (rules / terms / privacy)
    rendered to sanitised HTML, with placeholders interpolated. Reads the
    language from the request, falling back through bundled defaults."""
    name = a.input("name", "")
    if name not in ("rules", "terms", "privacy"):
        a.error.label(404, "errors.unknown_document")
        return
    html = mochi.text.markdown(mochi.document.get(name))
    a.json({"name": name, "html": html})
