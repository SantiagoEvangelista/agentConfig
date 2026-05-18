#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/SantiagoEvangelista/agentConfig.git"
INSTALL_DIR="${AGENT_CONFIG_DIR:-$HOME/.agentConfig}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required. Install git and rerun."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm/node is required. Install Node.js and rerun."
  exit 1
fi

if ! command -v pi >/dev/null 2>&1; then
  npm install -g @earendil-works/pi-coding-agent
fi

if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" pull --ff-only
else
  rm -rf "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

mkdir -p "$HOME/.pi" "$HOME/.agents"

if [ -d "$HOME/.pi/agent" ]; then
  backup="$HOME/.pi/agent.backup.$(date +%Y%m%d%H%M%S)"
  cp -a "$HOME/.pi/agent" "$backup"
  echo "Backed up existing Pi config to $backup"
fi

rsync -a "$INSTALL_DIR/pi/agent/" "$HOME/.pi/agent/"
rsync -a "$INSTALL_DIR/agents/" "$HOME/.agents/"

if [ -f "$HOME/.pi/agent/npm/package.json" ]; then
  (cd "$HOME/.pi/agent/npm" && npm install)
fi

for pkg in $(node -e 'const s=require(process.env.HOME+"/.pi/agent/settings.json"); for (const p of s.packages || []) console.log(p)'); do
  pi install "$pkg" || pi update "$pkg" || true
done

echo "agentConfig installed. Restart Pi to load changes."
