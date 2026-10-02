<script lang="ts" setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'

import {Copy, Download, Upload} from '@lucide/vue'

import {
  BulkCreateTasks,
  BulkDeleteTasks,
  ClearTasks,
  CreateTask,
  DeleteTask,
  ExportMarkdown,
  ImportMarkdown,
  ListTasks,
  MoveTask,
  UpdateTaskTitle,
} from '~wails/go/main/App'
import type {main} from '~wails/go/models'

import QuadrantPanel from '~/components/quadrant-panel.vue'
import {COLUMN_COUNT, gridPosition} from '~/lib/grid-position'
import {groupTasksByQuadrant, type QuadrantTask} from '~/lib/group-tasks-by-quadrant'
import {parseMatrixMarkdown} from '~/lib/parse-matrix-markdown'
import {QUADRANTS, type QuadrantId} from '~/lib/quadrants'
import {serializeMatrixMarkdown} from '~/lib/serialize-matrix-markdown'

const UNDO_DURATION_MS = 10_000

const LLM_PROMPT = `Create a task list for an Eisenhower Matrix using this exact markdown format:

# Q1: Do First (important and urgent)
- A task
- [ ] Another task
- [x] A task that is already done

# Q2: Schedule (important, not urgent)
- A task

# Q3: Delegate (urgent, not important)
- A task

# Q4: Eliminate (neither urgent nor important)
- A task

Rules:
- Use exactly these headings: "# Q1", "# Q2", "# Q3", "# Q4" (text after the number, like ": Do First", is fine).
- One task per line, written as a "-" bullet, or a "- [ ]" / "- [x]" checkbox.
- Do not nest bullets under other bullets.
- Keep each title under 200 characters.
- Only include quadrants that have tasks.`

const toQuadrantTask = (task: main.Task): QuadrantTask => ({
  id: task.id,
  title: task.title,
  quadrant: task.quadrant as QuadrantId,
  x: task.x,
  y: task.y,
})

const tasks = ref<QuadrantTask[]>([])
const editingTaskId = ref<string | null>(null)

const importMenuOpen = ref(false)
const pasteDialogOpen = ref(false)
const pasteText = ref('')
const fileError = ref<string | null>(null)

const undoableTaskIds = ref<string[] | null>(null)
const undoMessage = ref('')
let undoTimeoutId: ReturnType<typeof window.setTimeout> | null = null

const tasksByQuadrant = computed(() => groupTasksByQuadrant(tasks.value))

onMounted(async () => {
  const loaded = await ListTasks()

  tasks.value = loaded.map(toQuadrantTask)
})

onBeforeUnmount(() => {
  if (undoTimeoutId !== null) window.clearTimeout(undoTimeoutId)
})

const createTask = async (quadrantId: QuadrantId, x: number, y: number): Promise<void> => {
  const created = await CreateTask(quadrantId, x, y)

  tasks.value.push(toQuadrantTask(created))
  editingTaskId.value = created.id
}

const commitTitle = async (id: string, title: string): Promise<void> => {
  editingTaskId.value = null

  const isEmpty = title.length === 0

  if (isEmpty) {
    await DeleteTask(id)
    tasks.value = tasks.value.filter((task) => task.id !== id)
    return
  }

  await UpdateTaskTitle(id, title)

  const task = tasks.value.find((task) => task.id === id)

  if (task) task.title = title
}

const deleteTask = async (id: string): Promise<void> => {
  await DeleteTask(id)
  tasks.value = tasks.value.filter((task) => task.id !== id)
}

const moveTask = async (id: string, x: number, y: number): Promise<void> => {
  const task = tasks.value.find((task) => task.id === id)

  if (!task) return

  await MoveTask(id, task.quadrant, x, y)

  task.x = x
  task.y = y
}

const clearAllTasks = async (): Promise<void> => {
  await ClearTasks()
  tasks.value = []
}

const offerUndo = (ids: string[], message: string): void => {
  if (undoTimeoutId !== null) window.clearTimeout(undoTimeoutId)

  const pendingIds = undoableTaskIds.value ?? []

  undoableTaskIds.value = [...pendingIds, ...ids]
  undoMessage.value = message

  undoTimeoutId = window.setTimeout(() => {
    undoableTaskIds.value = null
    undoTimeoutId = null
  }, UNDO_DURATION_MS)
}

const undoImport = async (): Promise<void> => {
  const ids = undoableTaskIds.value

  if (!ids) return

  if (undoTimeoutId !== null) window.clearTimeout(undoTimeoutId)
  undoableTaskIds.value = null
  undoTimeoutId = null

  await BulkDeleteTasks(ids)

  const idSet = new Set(ids)
  tasks.value = tasks.value.filter((task) => !idSet.has(task.id))
}

const buildWarningSuffix = (skippedNestedBullets: number, truncatedTitles: number): string => {
  const notes: string[] = []

  if (skippedNestedBullets > 0) {
    notes.push(`${skippedNestedBullets} nested bullet${skippedNestedBullets === 1 ? '' : 's'} skipped`)
  }

  if (truncatedTitles > 0) {
    notes.push(`${truncatedTitles} title${truncatedTitles === 1 ? '' : 's'} truncated`)
  }

  if (notes.length === 0) return ''

  return ` (${notes.join(', ')})`
}

const importMarkdownContent = async (content: string): Promise<void> => {
  const result = parseMatrixMarkdown(content)

  if (!result.ok) {
    fileError.value = result.reason
    return
  }

  fileError.value = null

  if (result.items.length === 0) return

  const existingCountByQuadrant: Record<QuadrantId, number> = {
    1: tasksByQuadrant.value[1].length,
    2: tasksByQuadrant.value[2].length,
    3: tasksByQuadrant.value[3].length,
    4: tasksByQuadrant.value[4].length,
  }

  const newCountByQuadrant: Record<QuadrantId, number> = {1: 0, 2: 0, 3: 0, 4: 0}

  for (const item of result.items) newCountByQuadrant[item.quadrant] += 1

  const rowCountByQuadrant: Record<QuadrantId, number> = {
    1: Math.ceil((existingCountByQuadrant[1] + newCountByQuadrant[1]) / COLUMN_COUNT),
    2: Math.ceil((existingCountByQuadrant[2] + newCountByQuadrant[2]) / COLUMN_COUNT),
    3: Math.ceil((existingCountByQuadrant[3] + newCountByQuadrant[3]) / COLUMN_COUNT),
    4: Math.ceil((existingCountByQuadrant[4] + newCountByQuadrant[4]) / COLUMN_COUNT),
  }

  const nextIndexByQuadrant: Record<QuadrantId, number> = {...existingCountByQuadrant}

  const inputs: main.NewTask[] = result.items.map((item) => {
    const index = nextIndexByQuadrant[item.quadrant]

    nextIndexByQuadrant[item.quadrant] += 1

    const {x, y} = gridPosition(index, rowCountByQuadrant[item.quadrant])

    return {title: item.title, quadrant: item.quadrant, x, y}
  })

  const created = await BulkCreateTasks(inputs)

  tasks.value.push(...created.map(toQuadrantTask))

  const warningSuffix = buildWarningSuffix(result.warnings.skippedNestedBullets, result.warnings.truncatedTitles)
  const count = created.length

  offerUndo(
    created.map((task) => task.id),
    `Imported ${count} task${count === 1 ? '' : 's'}${warningSuffix}.`,
  )
}

const importFromFile = async (): Promise<void> => {
  importMenuOpen.value = false

  try {
    const content = await ImportMarkdown()

    if (!content) return

    await importMarkdownContent(content)
  } catch {
    fileError.value = 'Could not read that file.'
  }
}

const openPasteDialog = (): void => {
  importMenuOpen.value = false
  pasteText.value = ''
  pasteDialogOpen.value = true
}

const submitPasteImport = async (): Promise<void> => {
  const content = pasteText.value

  pasteDialogOpen.value = false

  if (!content.trim()) return

  try {
    await importMarkdownContent(content)
  } catch {
    fileError.value = 'Could not import that text.'
  }
}

const exportMarkdown = async (): Promise<void> => {
  const markdown = serializeMatrixMarkdown(tasks.value)

  try {
    await ExportMarkdown(markdown)
  } catch {
    fileError.value = 'Could not save that file.'
  }
}

const copyPrompt = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(LLM_PROMPT)
  } catch {
    fileError.value = 'Could not copy the prompt to the clipboard.'
  }
}

defineExpose({clearAllTasks})
</script>

<template>
  <div class="matrix-wrapper">
    <div class="matrix-toolbar">
      <div class="import-control">
        <button
          class="toolbar-button"
          type="button"
          @click="importMenuOpen = !importMenuOpen"
        >
          <Upload :size="15" />
          Import
        </button>

        <div v-if="importMenuOpen" class="import-menu-backdrop" @click="importMenuOpen = false" />

        <div v-if="importMenuOpen" class="import-menu">
          <button type="button" class="import-menu__item" @click="importFromFile">
            Choose file…
          </button>
          <button type="button" class="import-menu__item" @click="openPasteDialog">
            Paste text…
          </button>
        </div>
      </div>

      <button class="toolbar-button" type="button" @click="exportMarkdown">
        <Download :size="15" />
        Export
      </button>

      <button class="toolbar-button" type="button" @click="copyPrompt">
        <Copy :size="15" />
        Copy prompt for your LLM
      </button>
    </div>

    <div class="matrix">
      <QuadrantPanel
        v-for="quadrant in QUADRANTS"
        :key="quadrant.id"
        :quadrant="quadrant"
        :tasks="tasksByQuadrant[quadrant.id]"
        :editing-task-id="editingTaskId"
        @create-task="createTask"
        @commit-title="commitTitle"
        @request-delete="deleteTask"
        @move-task="moveTask"
      />
    </div>

    <div v-if="fileError" class="file-error" role="alert">
      <span>{{ fileError }}</span>
      <button type="button" @click="fileError = null">Dismiss</button>
    </div>

    <div v-if="undoableTaskIds" class="undo-toast">
      <span>{{ undoMessage }}</span>
      <button type="button" class="undo-toast__button" @click="undoImport">Undo</button>
    </div>

    <div v-if="pasteDialogOpen" class="paste-dialog-overlay" @click.self="pasteDialogOpen = false">
      <div class="paste-dialog" role="dialog" aria-modal="true">
        <h2 class="paste-dialog__title">Paste markdown</h2>
        <p class="paste-dialog__hint">
          Use "# Q1" through "# Q4" headings with "-" bullets underneath.
        </p>

        <textarea
          v-model="pasteText"
          class="paste-dialog__input"
          rows="12"
          placeholder="# Q1&#10;- A task"
        />

        <div class="paste-dialog__actions">
          <button type="button" @click="pasteDialogOpen = false">Cancel</button>
          <button type="button" class="paste-dialog__submit" @click="submitPasteImport">
            Import
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matrix-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.matrix-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.toolbar-button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.7rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: 0.8rem;
  cursor: pointer;
}

.toolbar-button:hover {
  background: var(--surface-hover-color);
}

.import-control {
  position: relative;
}

.import-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
}

.import-menu {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  z-index: 11;
  display: flex;
  flex-direction: column;
  min-width: 10rem;
  padding: 0.25rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.import-menu__item {
  padding: 0.4rem 0.6rem;
  border: none;
  border-radius: 0.3rem;
  background: transparent;
  color: var(--text-color);
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
}

.import-menu__item:hover {
  background: var(--surface-hover-color);
}

.matrix {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  flex: 1;
  min-height: 0;
  background: var(--border-color);
}

.file-error {
  --error-color: #dc2626;

  position: fixed;
  left: 50%;
  bottom: 1.5rem;
  transform: translateX(-50%);
  z-index: 21;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 28rem;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--error-color);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: 0.85rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.file-error button {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-muted-color);
  cursor: pointer;
  font-size: 0.8rem;
}

.undo-toast {
  position: fixed;
  left: 50%;
  bottom: 5rem;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: 0.85rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.undo-toast__button {
  flex-shrink: 0;
  padding: 0.25rem 0.6rem;
  border-radius: 0.3rem;
  border: 1px solid var(--border-color);
  background: var(--surface-hover-color);
  color: var(--text-color);
  font-size: 0.8rem;
  cursor: pointer;
}

.paste-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.paste-dialog {
  display: flex;
  flex-direction: column;
  width: 32rem;
  max-width: calc(100vw - 2rem);
  padding: 1.25rem;
  border-radius: 0.6rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.paste-dialog__title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  color: var(--text-color);
}

.paste-dialog__hint {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted-color);
}

.paste-dialog__input {
  width: 100%;
  resize: vertical;
  padding: 0.5rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-color);
  font: inherit;
  font-size: 0.8rem;
}

.paste-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.paste-dialog__actions button {
  padding: 0.4rem 0.85rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: 0.85rem;
  cursor: pointer;
}

.paste-dialog__actions button:hover {
  background: var(--surface-hover-color);
}

.paste-dialog__submit {
  border-color: transparent;
  background: var(--quadrant-2-color);
}
</style>
