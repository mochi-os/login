# Login app - authentication UI
# Unauthenticated login handled by core at /_/auth/*
# Authenticated operations use action handlers below

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

def action_identity_create(a):
    """Create user identity"""
    name = a.input("name")
    privacy = a.input("privacy", "public")
    if not name:
        a.error.label(400, "errors.name_required")
        return
    entity = mochi.entity.create("person", name, privacy)
    # Persist the language chosen on the landing page as the user's language
    # preference, so the UI, the Settings page, and layout direction stay in
    # sync from signup onward (without this, the UI renders in the chosen
    # language via Accept-Language but Settings shows the unset default).
    # Only set it when unset, so this never clobbers a later explicit choice.
    language = a.input("language", "")
    if a.user and language and not a.user.preference.get("language"):
        a.user.preference.set("language", str(language).strip().lower())
    a.json({"status": "ok", "entity": entity})

def action_methods_get(a):
    """Get user's required authentication methods"""
    methods = mochi.user.methods.get()
    a.json({"methods": methods})

def action_methods_set(a):
    """Set user's required authentication methods"""
    methods = a.json_input("methods")
    mochi.user.methods.set(methods)
    a.json({"ok": True})

def action_methods_reset(a):
    """Admin: reset user to email only"""
    uid = a.input("user", "")
    if not uid:
        a.error.label(400, "errors.missing_user_id")
        return
    mochi.user.methods.reset(uid)
    a.json({"ok": True})

def action_passkey_list(a):
    """List user's passkeys"""
    credentials = mochi.passkey.list()
    a.json({"credentials": credentials})

def action_passkey_count(a):
    """Count user's passkeys"""
    count = mochi.passkey.count()
    a.json({"count": count})

def action_passkey_register_begin(a):
    """Start passkey registration"""
    result = mochi.passkey.register.begin()
    a.json(result)

def action_passkey_register_finish(a):
    """Complete passkey registration"""
    ceremony = a.input("ceremony", "")
    credential = a.json_input("credential")
    name = a.input("name", "")
    result = mochi.passkey.register.finish(ceremony, credential, name)
    a.json(result)

def action_passkey_rename(a):
    """Rename a passkey"""
    id = a.input("id", "")
    name = a.input("name", "")
    mochi.passkey.rename(id, name)
    a.json({"ok": True})

def action_passkey_delete(a):
    """Delete a passkey"""
    id = a.input("id", "")
    mochi.passkey.delete(id)
    a.json({"ok": True})

def action_totp_setup(a):
    """Generate TOTP secret for user"""
    result = mochi.totp.setup()
    a.json(result)

def action_totp_verify(a):
    """Verify TOTP code and mark as verified"""
    code = a.input("code", "")
    ok = mochi.totp.verify(code)
    a.json({"ok": ok})

def action_totp_enabled(a):
    """Check if TOTP is enabled for user"""
    enabled = mochi.totp.enabled()
    a.json({"enabled": enabled})

def action_totp_disable(a):
    """Remove TOTP from user account"""
    mochi.totp.disable()
    a.json({"ok": True})

def action_recovery_generate(a):
    """Generate new recovery codes (replaces existing)"""
    codes = mochi.recovery.generate()
    a.json({"codes": codes})

def action_recovery_count(a):
    """Get remaining recovery code count"""
    count = mochi.recovery.count()
    a.json({"count": count})

def action_oauth_list(a):
    """List OAuth providers linked to the current user"""
    identities = mochi.user.oauth.list()
    a.json({"identities": identities})

def action_oauth_unlink(a):
    """Unlink an OAuth provider from the current user"""
    provider = a.input("provider", "")
    if not provider:
        a.error.label(400, "errors.provider_required")
        return
    mochi.user.oauth.unlink(provider)
    a.json({"ok": True})
