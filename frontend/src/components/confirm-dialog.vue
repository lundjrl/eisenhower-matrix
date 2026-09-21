<script lang="ts" setup>
const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div v-if="open" class="confirm-dialog-overlay" @click.self="emit('cancel')">
    <div class="confirm-dialog" role="alertdialog" aria-modal="true">
      <h2 class="confirm-dialog__title">{{ title }}</h2>
      <p class="confirm-dialog__message">{{ message }}</p>

      <div class="confirm-dialog__actions">
        <button type="button" class="confirm-dialog__button" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="confirm-dialog__button confirm-dialog__button--danger"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 10;
}

.confirm-dialog {
  min-width: 20rem;
  max-width: 24rem;
  padding: 1.25rem;
  border-radius: 0.6rem;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.confirm-dialog__title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--text-color);
}

.confirm-dialog__message {
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: var(--text-muted-color);
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.confirm-dialog__button {
  padding: 0.4rem 0.85rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  font-size: 0.85rem;
  cursor: pointer;
}

.confirm-dialog__button:hover {
  background: var(--surface-hover-color);
}

.confirm-dialog__button--danger {
  border-color: transparent;
  background: #dc2626;
  color: #fff;
}

.confirm-dialog__button--danger:hover {
  background: #b91c1c;
}
</style>
