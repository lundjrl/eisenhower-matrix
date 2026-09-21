<script lang="ts" setup>
import {Plus} from '@lucide/vue'

import {cascadePosition} from '~/lib/cascade-position'
import type {QuadrantTask} from '~/lib/group-tasks-by-quadrant'
import type {QuadrantConfig, QuadrantId} from '~/lib/quadrants'

import TaskCard from '~/components/task-card.vue'

const props = defineProps<{
  quadrant: QuadrantConfig
  tasks: QuadrantTask[]
  editingTaskId: string | null
}>()

const emit = defineEmits<{
  'create-task': [quadrantId: QuadrantId, x: number, y: number]
  'commit-title': [id: string, title: string]
  'request-delete': [id: string]
}>()

const addTask = (): void => {
  const {x, y} = cascadePosition(props.tasks.length)

  emit('create-task', props.quadrant.id, x, y)
}
</script>

<template>
  <section
    class="quadrant"
    :class="`quadrant--${quadrant.gridArea}`"
    :style="{background: `var(${quadrant.colorVar})`}"
    @dblclick="addTask"
  >
    <header class="quadrant__header">
      <div class="quadrant__heading">
        <h2>{{ quadrant.title }}</h2>
        <span>{{ quadrant.subtitle }}</span>
      </div>

      <button
        class="quadrant__add"
        type="button"
        :aria-label="`Add task to ${quadrant.title}`"
        @click.stop="addTask"
      >
        <Plus :size="16" />
      </button>
    </header>

    <TaskCard
      v-for="task in tasks"
      :id="task.id"
      :key="task.id"
      :title="task.title"
      :x="task.x"
      :y="task.y"
      :start-in-edit-mode="task.id === editingTaskId"
      @commit-title="(id, title) => emit('commit-title', id, title)"
      @request-delete="(id) => emit('request-delete', id)"
    />
  </section>
</template>

<style scoped>
.quadrant {
  position: relative;
  overflow: hidden;
  padding: 1rem;
  min-height: 0;
}

.quadrant__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.quadrant__heading {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  pointer-events: none;
  user-select: none;
}

.quadrant__heading h2 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-color);
}

.quadrant__heading span {
  font-size: 0.75rem;
  color: var(--text-muted-color);
}

.quadrant__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  cursor: pointer;
}

.quadrant__add:hover {
  background: var(--surface-hover-color);
}
</style>
