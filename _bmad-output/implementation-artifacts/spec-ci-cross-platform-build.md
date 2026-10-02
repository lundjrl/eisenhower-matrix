---
title: 'GitHub Actions cross-platform build on push to main'
type: 'feature'
created: '2026-10-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context: []
baseline_commit: '6476a3e791e7f0e9543bbf5a676066ea001e4ccb'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There's no CI. Producing a Windows, macOS, and Linux binary today means building manually on each OS by hand.

**Approach:** Add a GitHub Actions workflow, triggered on push to `main`, with one native build job per OS (Windows, macOS, Linux) that mirrors the existing `install.sh`/`build.sh` setup, runs the test suite, builds with `wails build`, and uploads each OS's binary as a workflow artifact.

## Boundaries & Constraints

**Always:**
- Trigger on `push` to `main` only — not pull requests, not other branches, not tags.
- One native job per OS on GitHub-hosted runners (`ubuntu-latest`, `windows-latest`, `macos-latest`) — no cross-compiling from a single host.
- Use the Go version from `go.mod` (1.25) and the Node version from `frontend/.nvmrc` (20.20.2) via each setup action's `*-version-file` input — never a hardcoded version that can drift from those files.
- Install the Wails CLI the same way `install.sh` does (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`).
- Linux installs `libwebkit2gtk-4.1-dev` first (per `install.sh`) and builds with `CGO_ENABLED=1` and `-tags webkit2_41` (per `build.sh`).
- `npm ci` runs inside `frontend/` (the real lockfile), never at the repo root (whose `package-lock.json` is an empty placeholder).
- Run `npm test` (frontend) and `go build ./...` before `wails build`; a failure in either fails that OS's job and produces no artifact for it, without affecting the other OS jobs.
- Unsigned Windows/macOS binaries are expected and acceptable — no code-signing or notarization (no certificates available).

**Never:**
- No deployment to an external host or package registry.
- No auto-created GitHub Release unless chosen in Open Questions.
- No new third-party Marketplace build action unless chosen in Open Questions.
- No app runtime/code changes — this is CI config (plus, conditionally, a one-line `wails.json` naming fix).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Push to main, all green | Commit lands on `main`, tests/build pass on all 3 OSes | 3 workflow artifacts produced, one per OS | N/A |
| One OS fails | Commit lands on `main`, Linux job's tests or build fail | Linux job fails, no Linux artifact; Windows/macOS jobs unaffected | GitHub Actions log shows the failing step |
| Push elsewhere | Commit on a non-`main` branch, or a PR opens | Workflow does not run | N/A |

## Decisions

- **Q1** Build approach: hand-roll each OS's install steps in the workflow YAML, mirroring `install.sh`/`build.sh` exactly. No third-party Marketplace build action.
- **Q2** Output naming: `wails.json`'s `outputfilename` is changed from `"scaffold"` to `"eisenhower-matrix"` so local and CI builds both produce correctly-named binaries.
- **Q3** Windows artifact: raw `.exe` only. The existing NSIS installer config is left untouched and unused by this workflow.
- **Q4** macOS packaging: the raw unsigned `.app` bundle, letting GitHub's artifact upload zip it automatically. No manual zipping, no code-signing or notarization.
- **Q5** Artifacts vs. Release: GitHub Actions workflow artifacts only, short retention (~14 days). No GitHub Release is created or updated.

</frozen-after-approval>

## Code Map

- `wails.json` -- `outputfilename: "scaffold"`, a pre-existing naming oversight; changed to `"eisenhower-matrix"` only if Q2 = (iii).
- `install.sh` -- the per-OS prerequisite list to mirror: Go 1.25+, Node via `frontend/.nvmrc` (20.20.2), Wails CLI via `go install .../wails/v2/cmd/wails@latest`, and on Linux specifically `libwebkit2gtk-4.1-dev`.
- `build.sh` -- the exact local build invocation to mirror on Linux: `CGO_ENABLED=1 GOARCH=amd64 wails build -tags webkit2_41`. Its `GOHOSTARCH` override is a known local-machine-only workaround (see `_bmad-output`/memory notes) -- not needed on GitHub-hosted runners.
- `frontend/.nvmrc` -- pins Node to `20.20.2`; feed to `actions/setup-node`'s `node-version-file` input.
- `go.mod` -- pins Go to `1.25.0`; feed to `actions/setup-go`'s `go-version-file` input.
- `package-lock.json` (root) -- placeholder, empty-packages lockfile. The real lockfile is `frontend/package-lock.json` (2959 lines) -- `npm ci` must run inside `frontend/`.
- `build/windows/installer/project.nsi`, `build/windows/wails.exe.manifest`, `build/darwin/Info.plist` -- pre-existing Wails-scaffolded per-OS resources `wails build` already picks up automatically; touched only if Q3 opts into the NSIS installer.
- New: `.github/workflows/build.yml` -- the only new file needed for the default answers.

## Tasks & Acceptance

**Execution:**
- [x] `wails.json` -- set `outputfilename` to `"eisenhower-matrix"` -- fixes the scaffold-name mismatch (Q2 default)
- [x] `.github/workflows/build.yml` -- new workflow: `permissions: contents: read`; `on: push: branches: [main]`; a concurrency group keyed on the ref that cancels superseded in-progress runs; `timeout-minutes: 20`; matrix via `include` mapping each OS to a friendly `artifact_name` (`ubuntu-latest`→`linux`, `windows-latest`→`windows`, `macos-latest`→`macos-arm64`, the last one honestly disclosing the runner's native architecture); per-job steps: checkout, `actions/setup-go` with `go-version-file: go.mod`, `actions/setup-node` with `node-version-file: frontend/.nvmrc` plus `cache: npm` / `cache-dependency-path: frontend/package-lock.json`, install the Wails CLI, Linux-only `libwebkit2gtk-4.1-dev` apt install, `go mod download`, `npm ci` in `frontend/`, `npm test` in `frontend/`, `npm run build` in `frontend/` (populates `frontend/dist`, required before the Go build step since `main.go` has `//go:embed all:frontend/dist`), `go build ./...`, `wails build` (Linux with `CGO_ENABLED=1` and `-tags webkit2_41`; Windows/macOS plain), then `actions/upload-artifact` naming each artifact `eisenhower-matrix-<artifact_name>` from `build/bin/*` with `if-no-files-found: error` and a 14-day retention

**Acceptance Criteria:**
- Given a push lands on `main` and every OS's tests and build pass, when the workflow completes, then three artifacts exist, one per OS, each containing that OS's built binary.
- Given a push lands on `main` and the Linux job's tests or build fail, when the workflow runs, then only the Linux job fails and produces no artifact; the Windows and macOS jobs complete and upload theirs independently.
- Given a commit lands on a branch other than `main`, or a pull request is opened, when that event fires, then the workflow does not run at all.

## Implementation Notes

- `wails.json`: `outputfilename` changed from `"scaffold"` to `"eisenhower-matrix"`.
- Added `.github/workflows/build.yml` matching the Tasks step order exactly: checkout, setup-go (`go-version-file: go.mod`), setup-node (`node-version-file: frontend/.nvmrc`), Wails CLI install (`go install .../wails@latest`, GOPATH/bin appended to `$GITHUB_PATH`), Linux-only `libwebkit2gtk-4.1-dev` apt install, `go mod download`, `npm ci`/`npm test` inside `frontend/`, `go build ./...`, then `wails build` (Linux: `CGO_ENABLED=1 wails build -tags webkit2_41`; Windows/macOS: plain `wails build`), then `actions/upload-artifact@v4` named `eisenhower-matrix-${{ matrix.os }}` from `build/bin/*` with `retention-days: 14`.
- `strategy.fail-fast: false` is set deliberately so one OS's job failure does not cancel the others, per the "one OS fails" acceptance criterion.
- `concurrency: { group: build-${{ github.ref }}, cancel-in-progress: true }` cancels superseded runs on the same ref.
- Job-level `defaults.run.shell: bash` so the same multi-line install/path-export steps work identically on all three runner OSes (Windows runners ship Git Bash).

**Verification performed:**
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))"` -- passed, no exception.
- `cd frontend && npm test` -- passed, 7 files / 36 tests green, unaffected by this change.
- `go build ./...` -- passed, unaffected by this change.
- Did not push to GitHub / watch a live Actions run (no CLI for that in this environment) -- the human should push and confirm all 3 matrix jobs go green and produce artifacts, per the spec's "Manual checks" section.
- After review pass 1: re-verified `python3 -c "import yaml; ..."`, `cd frontend && npm test` (36 tests), `go build ./...`, `go vet ./...` -- all clean. Additionally simulated a clean checkout locally (moved `frontend/dist` aside, ran `npm run build` then `go build ./...` in that order) to directly confirm the go:embed fix works, then restored `frontend/dist`.
- Still open: the Windows/macOS jobs' actual behavior (including the CGO_ENABLED question noted in the Review Triage Log) can only be confirmed by a real push.

## Spec Change Log

- **Trigger:** Review pass 1, high-severity finding — `go build ./...` ran before the frontend was built, and `main.go`'s `//go:embed all:frontend/dist` fails outright without a prior frontend build, so the workflow failed on every run, on all three OSes. Verified by reproduction (deleted `frontend/dist` locally, confirmed the exact failure, then confirmed a `npm run build` step beforehand fixes it).
- **Amended:** Inserted a "Build frontend assets" step (`npm run build` in `frontend/`) between the test step and the Go build step, so `frontend/dist` exists before anything tries to embed it. Folded in several smaller verified findings from the same pass: `permissions: contents: read`, `timeout-minutes: 20`, npm dependency caching on `setup-node`, `if-no-files-found: error` on the artifact upload, and renaming artifacts via an explicit `artifact_name` per OS (disclosing that the macOS build is arm64-only, since `macos-latest` is an Apple Silicon runner).
- **Known-bad state avoided:** every CI run failing at the Go build step; a missing build output silently reporting success with no artifact; an Intel Mac user downloading an arm64 binary with no indication it won't run.
- **KEEP:** the overall workflow shape is unchanged and worked well — native per-OS matrix, `fail-fast: false`, hand-rolled install steps mirroring `install.sh`/`build.sh`, the `wails.json` rename. Only the step ordering and the small hardening items above were corrected.

## Review Triage Log

Pass 1 (review_loop_iteration 1):

- **high** — `main.go` has `//go:embed all:frontend/dist`, and `frontend/dist` is gitignored (only populated by `npm run build`/`wails build`'s frontend hook). The workflow's "Build Go" step (`go build ./...`) runs before anything builds the frontend, so on a clean CI checkout it fails every time with `pattern all:frontend/dist: no matching files found`. Verified by reproduction: deleted `frontend/dist` locally and ran `go build ./...`, got that exact error. Root cause is a gap in the (non-frozen) Code Map/Tasks step ordering — I didn't investigate `main.go`'s embed directive during planning. Routed `bad_spec`; fixed directly (see Spec Change Log) rather than a full revert, consistent with this session's established approach.
- **low** — No caching configured for `actions/setup-node`; its default `cache-dependency-path` wouldn't find the lockfile anyway since the real one lives at `frontend/package-lock.json`, not repo root. Folded into this pass's amendment.
- **low** — No `timeout-minutes` set on the job; a stalled network call could run for GitHub's default six-hour ceiling on three runners at once. Folded into this pass's amendment.
- **low** — No `permissions:` block; the default `GITHUB_TOKEN` gets broad repo permissions though this workflow only checks out code and uploads an artifact. Folded into this pass's amendment.
- **low** — `actions/upload-artifact`'s default `if-no-files-found` is `warn`, so a missing build output would silently produce no artifact without failing the job, breaking the "three artifacts exist" acceptance criterion with no visible error. Folded into this pass's amendment.
- **medium** — `macos-latest` is an Apple Silicon (arm64) runner by default; with no `GOARCH` pin, the build produces an arm64-only binary that won't run natively on an older Intel Mac, and the artifact name (`eisenhower-matrix-macos-latest`) doesn't disclose this. Not addressed by Decisions Q3/Q4 (packaging format only, not CPU architecture) — a genuine gap my original Open Questions should have surfaced. Fixed the honest-labeling part now (artifact renamed to include `-arm64`); an Intel/universal macOS build is a bigger decision, logged to `deferred-work.md` rather than decided here.
- **false** — Claim that installing the Wails CLI via unpinned `go install .../wails@latest` risks drifting from `go.mod`'s pinned library version. Checked: this exactly matches `install.sh`'s own approach, which the frozen Boundaries explicitly require ("Install the Wails CLI the same way `install.sh` does"). Not a regression; it's the mandated behavior.
- **maybe-false** — `CGO_ENABLED` is set explicitly on the Linux build step (matching `build.sh`) but not for Windows/macOS. Likely harmless — `go.mod`'s `go-webview2`/`go-winloader` deps suggest Wails' Windows backend is pure-Go (no cgo needed), and macOS runners ship Xcode command-line tools, defaulting `CGO_ENABLED=1` already — but this can only be confirmed by an actual Windows/macOS CI run. What would settle it: the Windows and macOS job logs from the first real push. Deferred to that same first push rather than blocking here.
- **low, rejected** — No `paths`/`paths-ignore` filter, so doc-only commits (including this spec file) still trigger full 3-OS builds. Rejected: the explicit request was "whenever a push happens to main"; narrowing that with a path filter wasn't asked for and doc-only pushes are infrequent enough not to justify the added complexity.

## Design Notes

Each OS builds natively rather than cross-compiling from one host: Wails apps embed CGO and native GUI bindings (WebView2 on Windows, WebKitGTK on Linux, WebKit.framework on macOS) that aren't practical to cross-compile, so a 3-way runner matrix is the standard approach for Wails CI.

## Verification

**Commands:**
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))"` -- expected: no exception (valid YAML syntax); this project has no `act`/`actionlint` installed, so this is the only pre-push check available locally
- `cd frontend && npm test` -- expected: unaffected, still passes (sanity check the workflow didn't touch app code)
- `go build ./...` -- expected: unaffected, still passes

**Manual checks (if no CLI):**
- Push the branch to GitHub (or open it against `main` per the human's workflow) and watch the Actions run for all 3 jobs going green.
- Download each of the 3 artifacts and confirm the binary launches on its native OS.
</content>
