# Eisenhower Matrix

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
- The Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Linux only: WebKit dev headers, required to build/run the GUI:

  ```
  sudo apt install libwebkit2gtk-4.1-dev
  ```

  Run `wails doctor` to confirm all dependencies are installed.

## Install

```
cd frontend
nvm use
npm install
cd ..
```

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
