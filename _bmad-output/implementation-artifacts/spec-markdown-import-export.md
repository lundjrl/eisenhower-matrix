---
title: 'Markdown import and export for the matrix'
type: 'feature'
created: '2026-09-30'
status: 'draft'
route: ''
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users who plan with an external LLM have no way to get its output onto the matrix, and no way to take the matrix back out. Tasks must be created one at a time by double-clicking.

**Approach:** Define a fixed markdown format (`# Q1` to `# Q4` headings, bullet or checkbox items). Add a pure TypeScript parser and serializer, an import flow in the UI that adds tasks straight to the board with an undo, an export to the same format, and a "copy prompt for your LLM" button carrying the format instructions.

## Boundaries & Constraints

**Always:**
- Fixed format, no LLM call inside the app. Headings are strict `# Q1` to `# Q4`. Items are `- bullets` or `- [ ]` / `- [x]` checkboxes under a heading.
- Import adds to the current matrix (never replaces).
- Import goes straight onto the board, with an undo (no preview step).
- Imported tasks are laid out in a neat grid per quadrant and stay draggable like existing tasks.
- File with no recognizable quadrants is rejected with a message saying why.
- Hard limit of 200 total items per import.
- Parser and serializer are pure functions with unit tests, consistent with `frontend/src/lib/*.test.ts`.
- Input paths in scope: native file picker (plus paste and drag and drop if cheap; see Open Questions).
- Export and "copy prompt" button are both in scope.

**Never:**
- No LLM or network calls from the app.
- No replace-on-import behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid file | `# Q1` and `# Q2` sections with bullets and checkboxes | Tasks added to matching quadrants in a grid; undo offered | N/A |
| No quadrants | File without any `# Qn` heading | Nothing imported | Rejected with explanatory message |
| Over limit | More than 200 items in total | Nothing imported | Rejected with message giving the count and the limit |

</frozen-after-approval>

## Open Questions

Defaults are my recommendation. If the human has no preference, record the default as a decision.

- **A1 Agent upload path.** Options: (i) watched inbox folder `~/.config/eisenhower-matrix/inbox/` (about 20 percent of the work, needs app running) / (ii) CLI subcommand `import file.md` with single-instance handling (separate feature) / (iii) local HTTP endpoint (separate feature, network surface) / (iv) out of scope, file picker, paste and drag and drop only. Default: (iv). If (i) to (iii) are chosen, also decide: A2 feedback to the agent (for example a `result.json`), A3 behavior when the app is closed (import on next launch or out of scope), A4 whether agent-delivered imports show undo to the user.
- **A-input.** Which user input paths are required: file picker (yes, stated), paste-text dialog, drag and drop onto the window. Default: file picker plus paste.
- **B1 Undo lifetime.** Options: timed toast (about 10 seconds) / button that persists until the next task change. Default: toast.
- **B2 Undo scope.** Removes exactly the tasks created by that import, by ID, even if they were moved or edited since. Default: yes.
- **B3 Undo persistence.** In-memory only, lost on restart. Default: yes.
- **C1 Heading strictness.** Accept text after the `Qn` token (for example `# Q1: Do First`) / require exactly `# Q1`. Default: accept trailing text.
- **C2 Nested bullets.** Ignore and warn with the skipped count / flatten / merge into parent title. Default: ignore and warn.
- **C3 Checked boxes `[x]`.** Import like any item (no done state exists) / skip. Default: import.
- **C4 Messy input.** Skip blank items, merge duplicate headings, ignore stray prose between headings. Default: as stated.
- **C5 Limit check.** All-or-nothing before import. Default: yes.
- **C6 Title length.** Truncate at 200 characters and warn / no limit. Default: truncate.
- **D1 Export format.** Same format as import, so export then import round-trips. Default: yes.
- **D2 Export delivery.** Native save dialog / clipboard. Default: save dialog.
- **D3 Export in this spec.** Include (default) / defer to `deferred-work.md` as a separate goal.

## Code Map

- `task.go` -- `Task` struct, `taskStore` with mutex and JSON persistence to `~/.config/eisenhower-matrix/tasks.json`. Needs a bulk-create method (single persist) and a bulk-delete for undo. Do not change the `Task` JSON shape.
- `app.go` -- Wails-bound `App` methods (`ListTasks`, `CreateTask`, `MoveTask`, `DeleteTask`, `ClearTasks`). Add bound methods for bulk create and bulk delete; export and open dialogs would use `a.ctx` with Wails runtime dialogs.
- `frontend/wailsjs/go/main/App.{js,d.ts}` and `models.ts` -- generated bindings, regenerate rather than hand edit.
- `frontend/src/lib/cascade-position.ts` -- existing placement logic; reference for the grid layout (x, y are relative 0 to 1 within a quadrant). Add a separate grid function rather than changing cascade behavior.
- `frontend/src/lib/quadrants.ts`, `group-tasks-by-quadrant.ts` -- quadrant definitions and grouping; reuse for serializer.
- `frontend/src/components/eisenhower-matrix.vue`, `quadrant-panel.vue`, `task-card.vue`, `confirm-dialog.vue` -- board UI; import and export controls and undo toast attach here. `confirm-dialog.vue` is the existing dialog pattern.
- New (proposed): `frontend/src/lib/parse-matrix-markdown.ts`, `serialize-matrix-markdown.ts`, `grid-position.ts`, each with a colocated `.test.ts`.

## Tasks & Acceptance

To be written once Open Questions are resolved.

## Implementation Notes

## Spec Change Log

## Review Triage Log
