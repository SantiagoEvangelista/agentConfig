# piConfig

Sanitized backup of my Pi coding-agent configuration, packages, extensions, and skills.

## Contents

- `pi/agent/` — copied from `~/.pi/agent`, excluding auth, caches, databases, git checkouts, and installed `node_modules`.
- `agents/` — copied from `~/.agents`, including skill lockfile and installed skill files.

## Not included

- `~/.pi/agent/auth.json`
- `.env*`, token/secret/credential-like files
- `node_modules/`
- context-mode databases/cache files
- nested `.git/` directories

## Restore notes

Review files before restoring. A rough restore is:

```sh
rsync -a pi/agent/ ~/.pi/agent/
rsync -a agents/ ~/.agents/
cd ~/.pi/agent/npm && npm install
```

Then restart Pi.
