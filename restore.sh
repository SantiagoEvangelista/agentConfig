#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

rsync -a "$repo_dir/pi/agent/" "$HOME/.pi/agent/"
rsync -a "$repo_dir/agents/" "$HOME/.agents/"

if [ -f "$HOME/.pi/agent/npm/package.json" ]; then
  (cd "$HOME/.pi/agent/npm" && npm install)
fi

echo "Restored piConfig. Restart Pi to load changes."
