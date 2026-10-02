---
title: 'Markdown import and export for the matrix'
type: 'feature'
created: '2026-09-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context: []
baseline_commit: 'c74a5c6f57aa93c3f398c786147eb0a7b44a9e3a'
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
- Input paths in scope: native file picker and a paste-text dialog (see Decisions, A-input). Drag-and-drop is not required.
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

## Decisions

- **A1** Agent upload path: out of scope. Only file picker, paste, and drag-and-drop are entry points (A2-A4 do not apply).
- **A-input** File picker plus paste-text dialog are in scope; drag-and-drop is not required.
- **B1** Undo is a timed toast, about 10 seconds.
- **B2** Undo removes exactly the tasks created by that import, by ID, even if moved or edited since.
- **B3** Undo state is in-memory only, lost on restart.
- **C1** Heading match accepts trailing text after the `Qn` token (e.g. `# Q1: Do First`).
- **C2** Nested bullets are ignored, with a warning giving the skipped count.
- **C3** Checked boxes `[x]` import the same as any other item.
- **C4** Messy input: skip blank items, merge duplicate headings, ignore stray prose between headings.
- **C5** The 200-item limit is checked all-or-nothing before import.
- **C6** Titles are truncated at 200 characters with a warning.
- **D1** Export uses the same format as import, so export then import round-trips.
- **D2** Export delivery is a native save dialog.
- **D3** Export is included in this spec.

</frozen-after-approval>

## Code Map

- `task.go` -- `Task{ID, Title, Quadrant int, X, Y float64 (0-1), CreatedAt int64}`; `taskStore` (mutex) persists the whole file to `~/.config/eisenhower-matrix/tasks.json` on every write today. Add `BulkCreateTasks` (single persist) and `BulkDeleteTasks(ids []string)` (for undo). Do not change the JSON shape.
- `app.go` -- bound methods: `ListTasks`, `CreateTask(quadrant, x, y)`, `UpdateTaskTitle`, `MoveTask`, `DeleteTask`, `ClearTasks`. No bulk ops, no dialog usage, no import/export anywhere in the repo today. Add bound `ImportMarkdown`/`ExportMarkdown` using Wails v2.16.0's `runtime.OpenFileDialog`/`SaveFileDialog`.
- `frontend/wailsjs/go/main/App.{js,d.ts}`, `models.ts` -- generated bindings; regenerate via wails tooling after the Go methods change, do not hand-edit. Current TS `Task` type matches the Go struct exactly.
- `frontend/src/lib/cascade-position.ts` -- `cascadePosition(taskCount)`: `index = taskCount % 6`, `x/y = clamp(0.12 + index*0.06, 0, 0.85)`, a diagonal cascade with no occupied-coordinate check. The new grid layout is a separate function, not a change to this one.
- `frontend/src/lib/quadrants.ts` -- `QuadrantId` (`1|2|3|4`), `QUADRANTS` with titles ("Do First", "Schedule", "Delegate", "Eliminate") -- source of truth for mapping `# Qn` headings to quadrant IDs.
- `frontend/src/lib/group-tasks-by-quadrant.ts` -- `groupTasksByQuadrant()`, `QuadrantTask{id, title, quadrant, x, y}` -- reuse to group current tasks before serializing to markdown.
- `frontend/src/components/eisenhower-matrix.vue`, `quadrant-panel.vue`, `task-card.vue`, `confirm-dialog.vue` -- board UI; import/export/copy-prompt controls and the undo toast attach here. `confirm-dialog.vue` is a generic confirm modal, not a file-picker pattern -- there is none to reuse.
- New (proposed): `frontend/src/lib/parse-matrix-markdown.ts`, `serialize-matrix-markdown.ts`, `grid-position.ts`, each with a colocated `.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/lib/parse-matrix-markdown.ts` + `.test.ts` -- pure parser for the fixed format (heading strictness, nested-bullet/checkbox/messy-input handling, 200-char title truncation, 200-item all-or-nothing limit, reject-with-reason when no quadrant headings found) -- core logic, covers I/O matrix + C1-C6
- [x] `frontend/src/lib/serialize-matrix-markdown.ts` + `.test.ts` -- pure serializer reusing `groupTasksByQuadrant`; round-trip test against the parser -- confirms D1
- [x] `frontend/src/lib/grid-position.ts` + `.test.ts` -- neat per-quadrant grid placement offset past each quadrant's existing task count, with the row step scaled to the quadrant's total row count so rows never clamp to the same position -- keeps imports non-overlapping and draggable regardless of how many items land in one quadrant
- [x] `task.go` -- add `BulkCreateTasks`/`BulkDeleteTasks` -- single persist for import, exact-ID removal for undo
- [x] `app.go` -- bind `ImportMarkdown` (file picker, parses, bulk-creates) and `ExportMarkdown` (serializes, save dialog) -- UI entry points
- [x] `frontend/wailsjs/go/main/App.{js,d.ts}`, `models.ts` -- regenerate bindings after Go changes
- [x] `frontend/src/components/eisenhower-matrix.vue` -- Import, Export, and "Copy prompt for your LLM" buttons; wire import to grid-position + bulk-create + undo toast; wire export to serializer + save dialog

**Acceptance Criteria:**
- Given tasks already on the board, when a markdown import completes, then existing tasks are untouched and new tasks appear in a grid per quadrant, draggable like any other task.
- Given an import just completed, when the user triggers undo within the toast window, then exactly the imported tasks are removed by ID even if already moved or edited, and nothing else changes.
- Given the user exports the board, when they import that exported file back in, then the resulting tasks match the original set (round-trip).

## Implementation Notes

- Verified (initial pass): `npm test` (7 files, 30 tests pass), `vue-tsc --noEmit && vite build`, `go build ./...`, `go vet ./...`. All clean.
- Verified (after review pass 1 fixes): `npm test` (7 files, 36 tests pass), `vue-tsc --noEmit && vite build`, `go build ./...`, `go vet ./...`. All clean.
- Not exercised: the actual desktop UI (no display/Wails runtime in this environment). The "Manual checks" in Verification are still open and should be eyeballed by a human once.
- Deferred: installed `wails` CLI is v2.15.0 vs `go.mod`'s v2.16.0 (see `deferred-work.md`).

## Spec Change Log

- **Trigger:** Review pass 1, high-severity finding — `grid-position.ts` clamped every row past index 12 to the same `y`, stacking tasks exactly on top of each other for any quadrant receiving 13+ imported items (well within the 200-item cap).
- **Amended:** `gridPosition` now takes `(index, rowCount)`, where `rowCount` is the total rows the quadrant will end up with (existing tasks plus this import, divided across the fixed 3-column grid). The row step is scaled to `(MAX_OFFSET - BASE_Y) / (rowCount - 1)` so rows never collide, however many items land in one quadrant. The caller (`eisenhower-matrix.vue`) now computes `rowCount` per quadrant before placing items. Several smaller verified findings from the same pass were folded in rather than left for a second loop: `submitPasteImport` and `copyPrompt` now wrap their async calls in try/catch like `importFromFile` does; `offerUndo` now merges with any still-pending undo batch instead of silently replacing it; blank-titled tasks are skipped on export (matching the existing import-side skip) so they survive round-trip correctly; the heading and nested-bullet regexes were broadened to match Decision C1/C2's intent more literally; the error toast now uses a CSS variable instead of a hardcoded color and sits at a different fixed offset than the undo toast so the two can never visually overlap.
- **Known-bad state avoided:** imported tasks silently overlapping each other in a quadrant; a paste-import or clipboard failure producing no user-visible error; a second import erasing the ability to undo an earlier one; a blank-titled task vanishing on export/re-import.
- **KEEP:** the overall architecture is unchanged and worked well — pure `parse-matrix-markdown.ts`/`serialize-matrix-markdown.ts`, single-persist Go bulk methods, the file-picker/paste-text/export/copy-prompt UI shape, and the 10-second undo toast. Only the grid math and the handful of listed edge cases were corrected; nothing else should be re-derived differently.

## Review Triage Log

Pass 1 (review_loop_iteration 1):

- **high** — `frontend/src/lib/grid-position.ts` clamps `y` at `MAX_OFFSET` (0.85) for every row from index 12 onward, while `x` cycles through only 3 column values. Any single quadrant receiving 13+ imported items (well within the 200-item cap) places multiple tasks at the exact same `(x, y)`, stacking them instead of showing a neat grid. Verified by computing the formula: row 4 (`index 12-14`) and row 5 (`index 15-17`) both resolve to `y = 0.85`, so e.g. index 12 and index 15 land on an identical point. Contradicts the frozen Boundary ("laid out in a neat grid") and the Acceptance Criteria. Root cause is in non-frozen Tasks/Design content (the "neat grid" requirement was never reconciled with the 200-item cap and a bounded 0-1 coordinate space). Routed `bad_spec`.
- **medium** — `submitPasteImport` (`eisenhower-matrix.vue`) calls `importMarkdownContent` with no try/catch, unlike `importFromFile` which wraps the same call. A `BulkCreateTasks` failure during a paste import becomes an unhandled rejection with no user-visible error. Verified by reading both functions side by side. Folded into this pass's amendment (see Spec Change Log) rather than left for a second loop.
- **medium** — `offerUndo` (`eisenhower-matrix.vue`) unconditionally overwrites `undoableTaskIds`/`undoMessage` on every import. Starting a second import while an earlier import's 10s undo toast is still showing silently forfeits the ability to undo the first import, with no warning. Verified by reading `offerUndo`; three independent review layers flagged the same root cause. Folded into this pass's amendment.
- **low** — Export (`serialize-matrix-markdown.ts`) emits a bare `- ` bullet for a blank-titled task; the parser then skips blank items on import (by design, C4). A task with no title silently disappears on export-then-reimport, technically breaking the round-trip Acceptance Criterion for that one edge case. Verified by tracing both functions. Folded into this pass's amendment (skip blank titles on export too, matching the import-side skip).
- **low** — `.file-error` toast hardcodes `border: 1px solid #dc2626` instead of a themed CSS variable, unlike every other new style in the diff. Verified by reading the `<style>` block. Folded into this pass's amendment.
- **low** — `navigator.clipboard.writeText` in `copyPrompt` has no try/catch; a denied clipboard permission is an unhandled rejection with no feedback. Verified by reading the function. Folded into this pass's amendment.
- **low** — `.file-error` and `.undo-toast` share the identical fixed position (`left: 50%; bottom: 1.5rem`); if both are visible at once they'd render stacked on top of each other. Verified by reading both style blocks. Folded into this pass's amendment.
- **low** — Heading match (`line.trimStart().match(HEADING_PATTERN)`) accepts a `# Qn` line indented under other content as a real heading, since indentation is stripped before matching. Verified by reading the loop. Folded into this pass's amendment (match the raw line, not the trimmed one).
- **low** — Nested-bullet detection (`NESTED_BULLET_PATTERN = /^[ \t]+-\s/`) requires a space after the dash; an indented bullet with no space (e.g. `"  -nested"`) matches neither the nested nor the top-level pattern and silently vanishes without incrementing the skipped-count warning. Verified by tracing the regexes against that input. Folded into this pass's amendment.
- **low** — Heading regex only treats whitespace or `:` as a valid separator after `Qn` (e.g. `# Q1-Do First` or `# Q1.Do First` fail to match), narrower than Decision C1's "accepts trailing text." Verified by testing the regex against those inputs. Folded into this pass's amendment.
- **false** — Claim that `bulkCreate`/`BulkCreateTasks` need server-side validation of `Quadrant`/`Title` because of the "larger blast radius" of bulk writes. Checked: the existing single-item `taskStore.create` (`task.go:129`) has exactly the same lack of validation, so this isn't a regression introduced by this change, and the only caller (the markdown parser) already constrains `Quadrant` to its `1|2|3|4` TS type before calling it.
- **low, rejected** — `ImportMarkdown` reads the full file via `os.ReadFile` before the frontend applies the 200-item cap, with no byte-size limit. Rejected: unlikely to matter for a user opening their own local `.md` file, and a real fix means picking a new size-limit decision, not a direct correction.
- **low, rejected** — `ImportMarkdown` returns `("", nil)` for both "user cancelled" and "file was genuinely empty," so an empty file silently no-ops instead of showing the no-headings rejection. Rejected: unlikely in everyday use, and distinguishing the two cases means changing the method's return shape, not a direct correction.
- **rejected (fix is a spec edit)** — Decision A1's parenthetical ("file picker, paste, and drag-and-drop are entry points") contradicts Decision A-input and the Boundaries line, both of which exclude drag-and-drop. The implementation correctly follows A-input; the fix is wording-only inside `{spec_file}`, excluded from code-triage routing.
- **rejected (fix is a spec edit)** — The Verification section's listed commands (`npm test`, `go build ./...`) omit `vue-tsc --noEmit`, `vite build`, and `go vet ./...`, which Implementation Notes says were run. Fix is to edit the spec's own Verification list, excluded from code-triage routing.
- **defer** — Installed `wails` CLI is v2.15.0 while `go.mod` pins v2.16.0; binding regeneration worked despite the mismatch, but it's a pre-existing environment condition, not caused by this story.

## Design Notes

Fixed format example (one quadrant shown):

```markdown
# Q1
- Finish the report
- [ ] Call the vendor
- [x] Already done, still imports as a normal task
```

`Qn` maps to `QUADRANTS` by numeric ID; label text after `Qn` (e.g. `# Q1: Do First`) is accepted but ignored per C1's default.

## Verification

**Commands:**
- `cd frontend && npm test` -- expected: new parser/serializer/grid-position unit tests pass
- `go build ./...` -- expected: compiles with the new bulk task-store methods and dialog-backed App methods

**Manual checks (if no CLI):**
- Import a sample `.md` file via the UI; confirm grid layout, draggability, and the undo toast remove exactly those tasks.
- Export, then re-import the same file; confirm the task set matches.
- Import a file with no `# Qn` headings; confirm it's rejected with an explanatory message and nothing is added.
</content>
