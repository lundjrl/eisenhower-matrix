import {describe, expect, it} from 'vitest'

import {type QuadrantTask} from '~/lib/group-tasks-by-quadrant'
import {parseMatrixMarkdown} from '~/lib/parse-matrix-markdown'
import {serializeMatrixMarkdown} from '~/lib/serialize-matrix-markdown'

const buildTask = (overrides: Partial<QuadrantTask>): QuadrantTask => ({
  id: 'task-1',
  title: 'Untitled',
  quadrant: 1,
  x: 0.5,
  y: 0.5,
  ...overrides,
})

describe('serializeMatrixMarkdown', () => {
  it('writes a heading and bullets for each non-empty quadrant', () => {
    const tasks = [
      buildTask({id: 'a', quadrant: 1, title: 'Finish the report'}),
      buildTask({id: 'b', quadrant: 1, title: 'Call the vendor'}),
      buildTask({id: 'c', quadrant: 3, title: 'Delegate this'}),
    ]

    const markdown = serializeMatrixMarkdown(tasks)

    expect(markdown).toContain('# Q1: Do First')
    expect(markdown).toContain('- Finish the report')
    expect(markdown).toContain('- Call the vendor')
    expect(markdown).toContain('# Q3: Delegate')
    expect(markdown).toContain('- Delegate this')
    expect(markdown).not.toContain('Q2')
    expect(markdown).not.toContain('Q4')
  })

  it('collapses embedded newlines in a title to keep valid bullet lines', () => {
    const tasks = [buildTask({quadrant: 2, title: 'Line one\nLine two'})]

    const markdown = serializeMatrixMarkdown(tasks)

    expect(markdown).toContain('- Line one Line two')
  })

  it('round-trips through the parser (D1)', () => {
    const tasks = [
      buildTask({id: 'a', quadrant: 1, title: 'Finish the report'}),
      buildTask({id: 'b', quadrant: 1, title: 'Call the vendor'}),
      buildTask({id: 'c', quadrant: 2, title: 'Plan next quarter'}),
      buildTask({id: 'd', quadrant: 4, title: 'Delete this old idea'}),
    ]

    const markdown = serializeMatrixMarkdown(tasks)
    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual(
      tasks.map((task) => ({quadrant: task.quadrant, title: task.title})),
    )
  })

  it('returns an empty-ish document for an empty board', () => {
    expect(serializeMatrixMarkdown([])).toBe('\n')
  })

  it('skips blank-titled tasks so they do not reappear as empty bullets on re-import', () => {
    const tasks = [
      buildTask({id: 'a', quadrant: 1, title: ''}),
      buildTask({id: 'b', quadrant: 1, title: '   '}),
      buildTask({id: 'c', quadrant: 1, title: 'Finish the report'}),
    ]

    const markdown = serializeMatrixMarkdown(tasks)

    expect(markdown).not.toContain('- \n')
    expect(markdown).toContain('- Finish the report')

    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual([{quadrant: 1, title: 'Finish the report'}])
  })
})
