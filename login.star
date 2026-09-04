# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Login app. Unauthenticated login is handled by core at /_/auth/*; account
# management lives in the settings app.

def opengraph_landing(params):
    """OpenGraph for the landing page. Core sets og:url to the request URL
    and makes the image absolute against the serving host, so a link to any
    server previews as that server rather than as mochi-os.org. Title and
    description stay as index.html carries them."""
    return {"image": "/login/images/og-image.png", "type": "website"}

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
