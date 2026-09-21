<script lang="ts" setup>
import {ref} from 'vue'

import {Trash2} from '@lucide/vue'

import ConfirmDialog from '~/components/confirm-dialog.vue'
import EisenhowerMatrix from '~/components/eisenhower-matrix.vue'
import ThemeToggle from '~/components/theme-toggle.vue'

const matrixRef = ref<InstanceType<typeof EisenhowerMatrix>>()
const showClearConfirm = ref(false)

const confirmClear = async (): Promise<void> => {
  showClearConfirm.value = false
  await matrixRef.value?.clearAllTasks()
}
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1>Eisenhower Matrix</h1>

      <div class="app__actions">
        <button
          class="clear-tasks"
          type="button"
          aria-label="Clear all tasks"
          @click="showClearConfirm = true"
        >
          <Trash2 :size="18" />
        </button>

        <ThemeToggle />
      </div>
    </header>

    <EisenhowerMatrix ref="matrixRef" />

    <ConfirmDialog
      :open="showClearConfirm"
      title="Clear all tasks?"
      message="This permanently deletes every task on the matrix. This can't be undone."
      confirm-label="Clear all"
      cancel-label="Cancel"
      @confirm="confirmClear"
      @cancel="showClearConfirm = false"
    />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.app__header h1 {
  margin: 0;
  font-size: 1.1rem;
}

.app__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clear-tasks {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  cursor: pointer;
}

.clear-tasks:hover {
  background: var(--surface-hover-color);
}
</style>
