# Eisenhower Matrix

## AI Usage

This project was built with a lot of help from AI, and I want to be upfront
about that.

- **Code:** Most of the application code (Go backend and Vue frontend) was
  written by Claude Code. I decided what to build, directed the work through
  prompts, reviewed the results, ran the app, and asked for changes when
  something wasn't right.
- **Planning:** Early planning and design decisions were worked through with
  AI using the [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD).
  The BMAD skills are checked into `.claude/`, `.agents/`, and `_bmad/`.
- **Install script and docs:** `install.sh` and this README were drafted with
  AI and edited by me.
- **Not AI:** The app logo and icons were made without AI.

AI-written code can contain mistakes that look reasonable at a glance. If you
find a bug or something that doesn't make sense, please open an issue.

A desktop Eisenhower Matrix app built with Wails (Go backend) and Vue 3 + TypeScript (frontend).

- Q1 (top-left): Important & Urgent
- Q2 (top-right): Important & Not Urgent
- Q3 (bottom-left): Urgent & Not Important
- Q4 (bottom-right): Neither
- Double-click a quadrant to create a task there, like Obsidian Canvas
- Light/dark mode toggle (sun/moon icon, top right)
- Tasks persist to `~/.config/eisenhower-matrix/tasks.json`

## Screenshots

| Light | Dark |
| --- | --- |
| ![Light mode](screenshots/light-mode.png) | ![Dark mode](screenshots/dark-mode.png) |

## Prerequisites

- Go 1.25+ (the toolchain will auto-upgrade via `go.mod` if needed)
- Node (use the version in `frontend/.nvmrc`: `nvm use`)
- nvm, so `install.sh` can pick up the pinned Node version

## Install

On unix-like systems (Linux, macOS), run the install script from the project root:

```
./install.sh
```

This installs the Wails CLI, the frontend npm packages, the Go module
dependencies, and (on Linux) the WebKit dev headers required to build/run the
GUI. It finishes by running `wails doctor` so you can confirm everything is
set up correctly.

**PATH note:** the Wails CLI is installed to `$(go env GOPATH)/bin` (typically
`~/go/bin`). If running `wails` afterward gives you `command not found`, that
directory isn't on your `PATH`. Add it to your shell profile (e.g. `~/.bashrc`
or `~/.zshrc`):

```
export PATH="$PATH:$(go env GOPATH)/bin"
```

Then restart your terminal or run `source ~/.bashrc` (or the equivalent for
your shell).

## Live Development

From the project root:

```
wails dev
```

This runs the app with hot reload for frontend changes. A dev server also runs at
http://localhost:34115 if you want to open it in a browser and call the Go methods
from devtools.

## Testing

Frontend unit tests (vitest):

```
cd frontend
npm run test
```

Backend build check:

```
go build ./...
```

## Building

To build a redistributable, production-mode package:

```
wails build
```
