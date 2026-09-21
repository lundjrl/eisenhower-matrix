<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue'

import {ClearTasks, CreateTask, DeleteTask, ListTasks, MoveTask, UpdateTaskTitle} from '~wails/go/main/App'
import type {main} from '~wails/go/models'

import QuadrantPanel from '~/components/quadrant-panel.vue'
import {groupTasksByQuadrant, type QuadrantTask} from '~/lib/group-tasks-by-quadrant'
import {QUADRANTS, type QuadrantId} from '~/lib/quadrants'

const toQuadrantTask = (task: main.Task): QuadrantTask => ({
  id: task.id,
  title: task.title,
  quadrant: task.quadrant as QuadrantId,
  x: task.x,
  y: task.y,
})

const tasks = ref<QuadrantTask[]>([])
const editingTaskId = ref<string | null>(null)

const tasksByQuadrant = computed(() => groupTasksByQuadrant(tasks.value))

onMounted(async () => {
  const loaded = await ListTasks()

  tasks.value = loaded.map(toQuadrantTask)
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

defineExpose({clearAllTasks})
</script>

<template>
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
</template>

<style scoped>
.matrix {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  flex: 1;
  min-height: 0;
  background: var(--border-color);
}
</style>
