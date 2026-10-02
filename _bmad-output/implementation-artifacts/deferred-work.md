- source_spec: `_bmad-output/implementation-artifacts/spec-markdown-import-export.md`
  summary: Reconcile installed `wails` CLI (v2.15.0) with `go.mod`'s pinned v2.16.0.
  evidence: Binding regeneration worked despite the mismatch during this story, but the drift is pre-existing and could cause a less lucky mismatch later.
