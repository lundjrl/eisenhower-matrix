#!/usr/bin/env bash
set -euo pipefail

# Installs everything needed to build/run this project on unix-like systems
# (Linux, macOS): Go modules, the Wails CLI, Node/npm frontend deps, and the
# Linux WebKit dev headers required to build the GUI.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '\n==> %s\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

log "Checking Go toolchain"
if ! have go; then
  echo "Go is not installed. Install Go 1.25+ from https://go.dev/dl/ and re-run this script." >&2
  exit 1
fi
echo "Found $(go version)"

log "Checking Node via nvm"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"
elif have node; then
  echo "nvm not found, but node is already installed: $(node -v)"
else
  echo "nvm is not installed and node is not on PATH." >&2
  echo "Install nvm (https://github.com/nvm-sh/nvm) or Node $(cat "$ROOT_DIR/frontend/.nvmrc") and re-run." >&2
  exit 1
fi

if have nvm; then
  (cd "$ROOT_DIR/frontend" && nvm install && nvm use)
fi

if ! have npm; then
  echo "npm is not on PATH after Node setup." >&2
  exit 1
fi
echo "Using $(node -v) / npm $(npm -v)"

log "Checking Wails CLI"
if ! have wails; then
  echo "Installing Wails CLI..."
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  GOBIN="$(go env GOPATH)/bin"
  if [[ ":$PATH:" != *":$GOBIN:"* ]]; then
    echo "Note: add $GOBIN to your PATH to use the 'wails' command, e.g.:"
    echo "  export PATH=\"\$PATH:$GOBIN\""
  fi
else
  echo "Found $(wails version 2>/dev/null || echo wails)"
fi

if [[ "$(uname -s)" == "Linux" ]]; then
  log "Checking Linux WebKit dev headers"
  if pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
    echo "webkit2gtk-4.1 dev headers already installed."
  elif have apt-get; then
    echo "Installing libwebkit2gtk-4.1-dev via apt..."
    sudo apt-get update
    sudo apt-get install -y libwebkit2gtk-4.1-dev
  elif have dnf; then
    echo "Installing webkit2gtk4.1-devel via dnf..."
    sudo dnf install -y webkit2gtk4.1-devel
  elif have pacman; then
    echo "Installing webkit2gtk-4.1 via pacman..."
    sudo pacman -S --needed webkit2gtk-4.1
  elif have zypper; then
    echo "Installing webkit2gtk4-devel via zypper..."
    sudo zypper install -y webkit2gtk4-devel
  else
    echo "Could not detect a supported package manager. Install WebKit2GTK 4.1 dev headers manually." >&2
  fi
fi

log "Downloading Go module dependencies"
(cd "$ROOT_DIR" && go mod download)

log "Installing frontend npm dependencies"
(cd "$ROOT_DIR/frontend" && npm install)

log "Done"
if have wails; then
  wails doctor || true
fi

echo
echo "Install complete. Run './dev.sh' to start the app in development mode."
