---
title: 'Tagged GitHub Releases publishing built binaries'
type: 'feature'
created: '2026-10-02'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context: []
baseline_commit: '4e533350aec4847f804a2778ce0d8147ad711874'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The 3 OS binaries only land as 14-day Actions artifacts, invisible from the repo's main page. There's no way for someone to just click a download link and no version history.

**Approach:** Add a `release` job to the existing build workflow that runs after all 3 OS builds succeed, computes the next semantic-version tag, and uses the GitHub CLI (`gh release create`) to cut a new tagged GitHub Release with all 3 binaries attached — every push to `main`, versioned, never a rolling tag.

## Boundaries & Constraints

**Always:**
- One new tag + Release per successful push to `main` — only after all 3 matrix builds succeed (`needs: build`).
- Semantic versioning, `vMAJOR.MINOR.PATCH`. Every push bumps PATCH only (e.g. `v1.0.0` → `v1.0.1`); no commit-message parsing for bump type.
- Compute the next tag from the highest existing `v*` git tag, hand-rolled in bash (`git tag -l`, `sort -V`) — no third-party tagging/release Marketplace action, consistent with this workflow's existing no-Marketplace-action approach.
- Use the official `gh` CLI (pre-installed on GitHub-hosted runners) to create the tag and Release together; auto-generate release notes (`--generate-notes`) from commits since the last tag.
- Release assets are version-qualified per OS: `eisenhower-matrix-linux-<tag>` (raw binary), `eisenhower-matrix-windows-<tag>.exe` (raw binary), `eisenhower-matrix-macos-arm64-<tag>.zip` (the `.app` bundle zipped, since Release assets must be single files).
- The existing 14-day `upload-artifact` step is untouched and kept alongside the new Release (quick CI-debug access without needing a tag).
- The release job only needs `contents: write`; the existing `build` job keeps `contents: read`.
- Existing concurrency (`cancel-in-progress` per ref) is sufficient to prevent two pushes from racing to compute the same next tag — no additional locking.

**Never:**
- No rolling/"latest" tag that gets overwritten.
- No commit-message-driven major/minor bump logic.
- No new third-party Marketplace action.
- No changes to the 3 build jobs themselves beyond what's needed to pass artifacts to the new release job.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First-ever release | No `v*` tags exist yet | Tags `v1.0.0` (per Decision below), Release created with 3 assets | N/A |
| Normal push | Latest tag is `v0.1.4`, all 3 builds pass | Tags `v0.1.5`, Release created with 3 assets | N/A |
| A build fails | Any of the 3 OS matrix builds fails | `release` job does not run at all | No tag, no Release; failing OS's job shows the error |

## Decisions

- **Starting version:** the first-ever tag is `v1.0.0`.

</frozen-after-approval>

## Code Map

- `.github/workflows/build.yml` -- existing `build` job (matrix: `ubuntu-latest`/`windows-latest`/`macos-latest`, `artifact_name: linux`/`windows`/`macos-arm64`), already uploads each OS's binary as a 14-day Actions artifact via `actions/upload-artifact@v4` from `build/bin/*`. Add a second job, `release`, with `needs: build`, `permissions: contents: write` (job-level override; the existing top-level `permissions: contents: read` stays for `build`).
- No `CHANGELOG.md` or version file exists anywhere in the repo; `frontend/package.json`'s `"version": "0.0.0"` is boilerplate, not a maintained source of truth -- do not read or write it.
- No git tags exist yet (`git tag -l` is empty) -- the first run is the "no tags yet" case in the I/O matrix.
- `wails.json`'s `outputfilename` is `"eisenhower-matrix"` (already fixed in a prior story) -- `build/bin/` contains `eisenhower-matrix` (Linux), `eisenhower-matrix.exe` (Windows), `eisenhower-matrix.app/` (macOS, a directory bundle).
- `gh` CLI is pre-installed on all 3 GitHub-hosted runner images -- no install step needed, but the `release` job itself only needs to run once (`runs-on: ubuntu-latest` is enough; it only downloads already-built artifacts, it doesn't rebuild anything).
- `actions/download-artifact@v4` with a `pattern` matching all 3 artifact names pulls them into per-artifact subdirectories for the release job to read.

## Tasks & Acceptance

**Execution:**
- [x] `.github/workflows/build.yml` -- add `release` job: `needs: build`, `runs-on: ubuntu-latest`, `permissions: { contents: write }`; steps: checkout with `fetch-depth: 0` (full tag history), `actions/download-artifact@v4` pulling all `eisenhower-matrix-*` artifacts, a step computing the next `vMAJOR.MINOR.PATCH` tag from `git tag -l 'v*' --sort=-v:refname` (first run → `v1.0.0`), a step zipping the downloaded macOS `.app` bundle and renaming the Linux/Windows binaries to their version-qualified asset names, then `gh release create <tag> <3 asset files> --title <tag> --generate-notes`

**Acceptance Criteria:**
- Given all 3 OS builds succeed on a push to `main`, when the workflow completes, then exactly one new git tag and GitHub Release exist, one patch version higher than the previous release (or `v1.0.0` if none existed), with exactly 3 assets attached.
- Given any one of the 3 OS builds fails, when the workflow runs, then no tag and no Release are created.
- Given a Release was just created, when viewing the repo's main page, then the sidebar's Releases section shows the new tag as the latest release with downloadable assets.

## Implementation Notes

- Added the `release` job to `.github/workflows/build.yml`: `needs: build`, job-level `permissions: { contents: write }`, checkout with `fetch-depth: 0` + `fetch-tags: true` (a known `actions/checkout@v4` gotcha: tags aren't fetched by default even at full depth unless `fetch-tags: true` is explicit), `actions/download-artifact@v4` with `pattern: eisenhower-matrix-*`, bash tag-bump logic matching the spec's verified cases, asset renaming/zipping, then `gh release create` with `--generate-notes`.
- Added `--target "${{ github.sha }}"` to `gh release create`, beyond the spec's literal step text: without it, the tag would point at whatever `main` currently is when the job runs rather than the exact commit that triggered the build, which could drift if `main` advances in between. Stays within the spec's boundaries (no Marketplace action, no rolling tag, no build-job changes).
- Caught and fixed before formal review: the job's `permissions:` block only declared `contents: write`; specifying any `permissions:` key makes it an allow-list, not an additive override, so `actions: read` (required by `download-artifact` to fetch artifacts from the same run) was implicitly `none`. Added `actions: read` alongside `contents: write`.
- Verified: YAML syntax check passes. The tag-bump bash logic was dry-run against a throwaway git repo for the 3 cases the spec's Verification section lists (no tags → `v1.0.0`; `v1.0.0` present → `v1.0.1`; `v2.3.9` present → `v2.3.10`), plus a check that `--sort=-v:refname` picks the highest tag rather than the most recently created one. Not exercised: an actual GitHub Actions run (`gh release create`, cross-job artifact download, the real sidebar listing) -- needs a real push per the spec's own Manual checks.
- After review pass 1: re-verified YAML syntax, and re-ran the dry-run including the two new hardening cases -- a malformed tag (`v1.2.08`, `vnext`) mixed into the tag list is correctly skipped rather than crashing or corrupting the result, still landing on `v2.3.10` in that scenario. Added a one-line README pointer to the Releases page.
- Expected rough edge, not a defect: the very first release's `--generate-notes` will list the full commit history (no prior tag to diff against), not just "what's new." This is GitHub's normal behavior for a repo's first release.

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 1):

- **medium** — The version-bump bash (`IFS='.' read -r major minor patch`) assumes every tag matching `v*` is a clean `vMAJOR.MINOR.PATCH`. A stray non-conforming tag (`v1.2`, `v1.2.3-rc1`, `vnext`) would make the arithmetic fail, blocking every future release run until a human removes the bad tag. Verified by tracing the parse against those inputs. Fixed: validate the latest tag against a strict `^v[0-9]+\.[0-9]+\.[0-9]+$` regex before parsing, fall back to `v1.0.0` (treating a malformed tag the same as "no valid tag yet") instead of crashing.
- **low** — Related: a patch segment with a leading zero (e.g. `v1.2.08`) is invalid octal in bash arithmetic (`$((08 + 1))` errors). Fixed in the same pass: force base-10 with `10#$patch`.
- **low** — No `timeout-minutes` on the new `release` job, unlike the hardening already applied to `build` in the prior story. Folded into this pass's amendment.
- **low** — No check that all 3 expected artifact directories exist before `cp`/`zip`; a missing one would surface as a generic "no such file" error rather than naming which OS/artifact is missing. Folded into this pass's amendment (explicit existence check with a clear message); low risk in practice since `needs: build` + each leg's `if-no-files-found: error` already guarantee an artifact per successful leg.
- **low** — Design Notes overstated `cancel-in-progress` as fully preventing tag collisions; it only cancels a *queued* duplicate, not one already mid-run. Corrected the claim's wording to be accurate (a genuine same-second double-push race still fails loudly via `gh release create`'s own "tag already exists" rejection, not silently) rather than adding distributed locking for an edge case this unlikely.
- **low, rejected** — Full idempotency/locking against two concurrent `release` runs computing the same tag. Rejected: requires two pushes to `main` within the same few seconds, and the failure mode is already a loud, clear `gh` error rather than silent corruption — not worth the added complexity.
- **low, rejected** — No README mention that binaries are now published as GitHub Releases. The literal ask ("show them in the sidebar") is satisfied automatically by GitHub once Releases exist — no README change is required for that. Still, a one-line pointer is cheap and directly serves discoverability, so added anyway (see Implementation Notes) rather than left out.
- **false** — Unsigned macOS/Windows binaries triggering Gatekeeper/SmartScreen warnings. Checked: this is the prior story's explicit, already-approved decision (no certificates available), not a gap introduced by this change.
- **false** — `yaml.safe_load` only validates YAML syntax, not GitHub Actions semantics (job schema, `${{ }}` expressions). True, but no `actionlint`/equivalent exists in this repo or environment to do better (confirmed absent in both this and the prior story's review) — not a regression, an existing tooling gap.
- **defer** — No automated test pins the version-bump bash logic or asset-packaging step; only manually dry-run against a throwaway repo, which won't re-run on future edits to this file. Logged to `deferred-work.md` alongside the broader lack of `actionlint`/`shellcheck` coverage for `.github/workflows/`.

## Design Notes

Tag race safety: this workflow's existing `concurrency: { group: build-${{ github.ref }}, cancel-in-progress: true }` cancels a *queued* duplicate run when a new push lands on the same ref, which covers the common case. It does not guarantee an already-*running* `release` job gets interrupted before `gh release create` finishes. In the rare case of two pushes within the same few seconds, the loser's `gh release create` fails loudly on "tag/release already exists" rather than silently corrupting anything — an acceptable failure mode for how unlikely that race is, without adding distributed locking.

## Verification

**Commands:**
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))"` -- expected: no exception (valid YAML syntax)
- A local shell dry-run of the version-bump logic against a handful of fake tag lists (e.g. empty, `v1.0.0`, `v2.3.9`) -- expected: produces `v1.0.0`, `v1.0.1`, `v2.3.10` respectively

**Manual checks (if no CLI):**
- Push to `main` and confirm the Actions run's `release` job creates a tag and Release with 3 correctly-named assets attached, and that the repo sidebar shows it.
- Download each asset and confirm it's the right binary for its OS (the macOS one should unzip to a working `.app`).
</content>
