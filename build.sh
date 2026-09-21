#!/usr/bin/env bash
set -euo pipefail

# GOHOSTARCH gets clobbered to 386 somewhere in this shell's environment,
# which makes GOTOOLCHAIN=auto download a 32-bit Go compiler and link it
# against 64-bit system libs. Force the correct values here so wails dev
# is not at the mercy of the ambient environment.
export GOHOSTARCH=amd64
export GOARCH=amd64
export CGO_ENABLED=1

wails dev -tags webkit2_41
