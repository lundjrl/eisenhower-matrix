import {clamp} from '~/lib/clamp'

const STEP = 0.06
export const MAX_OFFSET = 0.85
const BASE_X = 0.12
const BASE_Y = 0.2
const WRAP_AFTER = 6

export interface Position {
  x: number
  y: number
}

export const cascadePosition = (taskCount: number): Position => {
  const index = taskCount % WRAP_AFTER

  return {
    x: clamp(BASE_X + index * STEP, 0, MAX_OFFSET),
    y: clamp(BASE_Y + index * STEP, 0, MAX_OFFSET),
  }
}
