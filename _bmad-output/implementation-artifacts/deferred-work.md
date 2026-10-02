- source_spec: `_bmad-output/implementation-artifacts/spec-markdown-import-export.md`
  summary: Reconcile installed `wails` CLI (v2.15.0) with `go.mod`'s pinned v2.16.0.
  evidence: Binding regeneration worked despite the mismatch during this story, but the drift is pre-existing and could cause a less lucky mismatch later.
- source_spec: `_bmad-output/implementation-artifacts/spec-ci-cross-platform-build.md`
  summary: Decide whether the macOS CI build should also target Intel (x86_64) or ship as a universal binary, not just the `macos-latest` runner's native arm64.
  evidence: GitHub's `macos-latest` runner is Apple Silicon by default; the current workflow produces an arm64-only binary (now honestly labeled `eisenhower-matrix-macos-arm64`) with no Intel Mac support. Adding that means either a second matrix leg on an Intel runner or a `lipo`-merged universal build — a real decision, not a direct fix.
