import {describe, expect, it} from 'vitest'

import {groupTasksByQuadrant, type QuadrantTask} from '~/lib/group-tasks-by-quadrant'

const buildTask = (overrides: Partial<QuadrantTask>): QuadrantTask => ({
  id: 'task-1',
  title: 'Untitled',
  quadrant: 1,
  x: 0.5,
  y: 0.5,
  ...overrides,
})

describe('groupTasksByQuadrant', () => {
  it('buckets tasks into their own quadrant, preserving order', () => {
    const tasks = [
      buildTask({id: 'a', quadrant: 1}),
      buildTask({id: 'b', quadrant: 3}),
      buildTask({id: 'c', quadrant: 1}),
    ]

    const grouped = groupTasksByQuadrant(tasks)

    expect(grouped[1].map((task) => task.id)).toEqual(['a', 'c'])
    expect(grouped[3].map((task) => task.id)).toEqual(['b'])
    expect(grouped[2]).toEqual([])
    expect(grouped[4]).toEqual([])
  })

  it('returns all four empty groups for an empty task list', () => {
    expect(groupTasksByQuadrant([])).toEqual({1: [], 2: [], 3: [], 4: []})
  })
})
