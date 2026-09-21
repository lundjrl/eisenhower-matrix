<script lang="ts" setup>
import {nextTick, ref, watch} from 'vue'

import {MAX_OFFSET} from '~/lib/cascade-position'
import {clamp} from '~/lib/clamp'

const DRAG_THRESHOLD = 4

interface DragState {
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  parentWidth: number
  parentHeight: number
  moved: boolean
}

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
  move: [id: string, x: number, y: number]
}>()

const isEditing = ref(props.startInEditMode)
const draftTitle = ref(props.title)
const inputRef = ref<HTMLTextAreaElement>()
const cardRef = ref<HTMLDivElement>()

const isDragging = ref(false)
const localX = ref(props.x)
const localY = ref(props.y)
let dragState: DragState | null = null
let suppressClick = false

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

watch(
  () => props.x,
  (value) => {
    if (!dragState) localX.value = value
  },
)

watch(
  () => props.y,
  (value) => {
    if (!dragState) localY.value = value
  },
)

const startEditing = (): void => {
  if (isEditing.value) return

  if (suppressClick) {
    suppressClick = false
    return
  }

  draftTitle.value = props.title
  isEditing.value = true
  focusInput()
}

const onPointerDown = (event: PointerEvent): void => {
  if (isEditing.value) return
  if (event.button !== 0) return

  const target = event.target as HTMLElement

  if (target.closest('.task-card__delete')) return

  const parent = cardRef.value?.offsetParent as HTMLElement | null

  if (!parent) return

  const parentRect = parent.getBoundingClientRect()

  dragState = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: localX.value,
    startY: localY.value,
    parentWidth: parentRect.width,
    parentHeight: parentRect.height,
    moved: false,
  }

  cardRef.value?.setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent): void => {
  if (!dragState) return

  const deltaX = event.clientX - dragState.startClientX
  const deltaY = event.clientY - dragState.startClientY

  if (!dragState.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return

  dragState.moved = true
  isDragging.value = true

  localX.value = clamp(dragState.startX + deltaX / dragState.parentWidth, 0, MAX_OFFSET)
  localY.value = clamp(dragState.startY + deltaY / dragState.parentHeight, 0, MAX_OFFSET)
}

const onPointerUp = (event: PointerEvent): void => {
  if (!dragState) return

  cardRef.value?.releasePointerCapture(event.pointerId)

  if (dragState.moved) {
    suppressClick = true
    emit('move', props.id, localX.value, localY.value)
  }

  dragState = null
  isDragging.value = false
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
  <div
    ref="cardRef"
    class="task-card"
    :class="{'task-card--dragging': isDragging}"
    :style="{left: `${localX * 100}%`, top: `${localY * 100}%`}"
    @dblclick.stop="startEditing"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
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
  cursor: grab;
  touch-action: none;
}

.task-card--dragging {
  cursor: grabbing;
  user-select: none;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
}

.task-card__title {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-color);
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;
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
