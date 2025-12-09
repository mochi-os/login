# Login app - authentication UI
# Unauthenticated login handled by core at /_/auth/*
# Authenticated operations use action handlers below

def action_logout(a):
    """Log out current user"""
    a.logout()
    a.json({"status": "ok"})

def action_identity_create(a):
    """Create user identity"""
    name = a.input("name")
    privacy = a.input("privacy", "public")
    if not name:
        a.error(400, "name required")
        return
    entity = mochi.entity.create("person", name, privacy)
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
    user = int(a.input("user"))
    mochi.user.methods.reset(user)
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
    ceremony = a.input("ceremony")
    credential = a.json_input("credential")
    name = a.input("name", "")
    result = mochi.passkey.register.finish(ceremony, credential, name)
    a.json(result)

def action_passkey_rename(a):
    """Rename a passkey"""
    id = a.input("id")
    name = a.input("name")
    mochi.passkey.rename(id, name)
    a.json({"ok": True})

def action_passkey_delete(a):
    """Delete a passkey"""
    id = a.input("id")
    mochi.passkey.delete(id)
    a.json({"ok": True})

def action_totp_setup(a):
    """Generate TOTP secret for user"""
    result = mochi.totp.setup()
    a.json(result)

def action_totp_verify(a):
    """Verify TOTP code and mark as verified"""
    code = a.input("code")
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
