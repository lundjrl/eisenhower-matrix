<script lang="ts" setup>
import {nextTick, ref, watch} from 'vue'

const props = defineProps<{
  id: string
  title: string
  x: number
  y: number
  startInEditMode: boolean
}>()

const emit = defineEmits<{
  'commit-title': [id: string, title: string]
  'request-delete': [id: string]
}>()

const isEditing = ref(props.startInEditMode)
const draftTitle = ref(props.title)
const inputRef = ref<HTMLTextAreaElement>()

const focusInput = async (): Promise<void> => {
  await nextTick()
  inputRef.value?.focus()
}

watch(
  () => props.startInEditMode,
  (shouldEdit) => {
    if (!shouldEdit) return

    isEditing.value = true
    focusInput()
  },
  {immediate: true},
)

const startEditing = (): void => {
  draftTitle.value = props.title
  isEditing.value = true
  focusInput()
}

const commitEdit = (): void => {
  isEditing.value = false
  emit('commit-title', props.id, draftTitle.value.trim())
}

const cancelEdit = (): void => {
  draftTitle.value = props.title
  isEditing.value = false
}
</script>

<template>
  <div class="task-card" :style="{left: `${x * 100}%`, top: `${y * 100}%`}" @dblclick.stop>
    <button
      class="task-card__delete"
      type="button"
      aria-label="Delete task"
      @click="emit('request-delete', id)"
    >
      &times;
    </button>

    <textarea
      v-if="isEditing"
      ref="inputRef"
      v-model="draftTitle"
      class="task-card__input"
      rows="2"
      @keydown.enter.exact.prevent="commitEdit"
      @keydown.escape.prevent="cancelEdit"
      @blur="commitEdit"
    />
    <p v-else class="task-card__title" @click="startEditing">
      {{ title || 'New task…' }}
    </p>
  </div>
</template>

<style scoped>
.task-card {
  position: absolute;
  transform: translate(-8px, -8px);
  min-width: 10rem;
  max-width: 14rem;
  padding: 0.5rem 0.65rem;
  border-radius: 0.5rem;
  background: var(--card-color);
  border: 1px solid var(--card-border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  cursor: default;
}

.task-card__title {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-color);
  white-space: pre-wrap;
  word-break: break-word;
  cursor: text;
}

.task-card__input {
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  color: var(--text-color);
}

.task-card__delete {
  position: absolute;
  top: 0.15rem;
  right: 0.3rem;
  border: none;
  background: transparent;
  color: var(--text-muted-color);
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.task-card:hover .task-card__delete {
  opacity: 1;
}
</style>
