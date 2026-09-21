import type {QuadrantId} from '~/lib/quadrants'

export interface QuadrantTask {
  id: string
  title: string
  quadrant: QuadrantId
  x: number
  y: number
}

export type TasksByQuadrant = Record<QuadrantId, QuadrantTask[]>

const toEmptyGroups = (): TasksByQuadrant => ({
  1: [],
  2: [],
  3: [],
  4: [],
})

const addTaskToGroup = (groups: TasksByQuadrant, task: QuadrantTask): TasksByQuadrant => {
  groups[task.quadrant].push(task)

  return groups
}

export const groupTasksByQuadrant = (tasks: QuadrantTask[]): TasksByQuadrant => {
  return tasks.reduce(addTaskToGroup, toEmptyGroups())
}
