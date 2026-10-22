# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# The consent page for another app signing in to one of the user's hosted
# accounts (the federation plan, phase 11): which app is asking, for which
# account and with what access, and where posts made from the app land when
# it asks to write and the account has no home feed yet (decision 42). Core
# holds the request and spends it on approval or refusal; only this app may
# answer, under the restricted oauth/consent permission.

def action_oauth_consent_request(a):
    """The request named: the client, the network, the scopes, the user's
    hosted accounts on that network with their home feeds, and the user's own
    public feeds to choose a home feed from."""
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    id = a.input("request", "")
    if not id:
        a.error.label(400, "errors.request_is_required")
        return
    request = mochi.oauth.request(id)
    if not request:
        a.error.label(404, "errors.request_not_found")
        return
    feeds = []
    for feed in mochi.service.call("feeds", "list") or []:
        if feed.get("privacy") == "public":
            feeds.append({"id": feed["id"], "name": feed["name"]})
    a.json({"request": request, "feeds": feeds})

def action_oauth_consent_approve(a):
    """Approve the request for one account. Where the client asks to write and
    the account has no home feed, the user names an existing public feed or
    has one made, named after the account. Answers where the browser goes."""
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    id = a.input("request", "")
    account = a.input("account", "")
    if not id:
        a.error.label(400, "errors.request_is_required")
        return
    if not account:
        a.error.label(400, "errors.account_is_required")
        return
    request = mochi.oauth.request(id)
    if not request:
        a.error.label(404, "errors.request_not_found")
        return
    chosen = None
    for candidate in request.get("accounts", []):
        if candidate.get("id") == account:
            chosen = candidate
    if not chosen:
        a.error.label(404, "errors.account_not_found")
        return
    feed = a.input("feed", "")
    if request.get("writes") and not chosen.get("home") and not feed:
        if a.input("create", "") != "true":
            a.error.label(400, "errors.feed_is_required")
            return
        made = mochi.service.call("feeds", "create", chosen.get("name") or chosen.get("identifier"), "public", account)
        if not made:
            a.error.label(500, "errors.feed_not_created")
            return
        feed = made["id"]
    a.json(mochi.oauth.approve(id, account, feed=feed))

def action_oauth_consent_refuse(a):
    """Refuse the request. Answers where the browser goes."""
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    id = a.input("request", "")
    if not id:
        a.error.label(400, "errors.request_is_required")
        return
    result = mochi.oauth.refuse(id)
    if not result:
        a.error.label(404, "errors.request_not_found")
        return
    a.json(result)
