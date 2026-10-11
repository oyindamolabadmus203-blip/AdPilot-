---
name: GitHub source control
description: GitHub connection state and local Git authentication may not match.
---

Do not assume a “connected” GitHub note means the local Git CLI can push. Confirm the push succeeds before reporting a repository update. Never ask the user to paste a token; if authentication fails, use Replit's Connected Services and Git pane reconnect flow.

**Why:** the GitHub connection was reported active, but the workspace CLI lacked a credential helper and pushes were rejected.

**How to apply:** For GitHub push tasks, verify the remote write. If authentication fails, stop remote writes, have the user reconnect through Replit, then retry.
