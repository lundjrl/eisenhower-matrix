import {groupTasksByQuadrant, type QuadrantTask} from '~/lib/group-tasks-by-quadrant'
import {QUADRANTS} from '~/lib/quadrants'

const sanitizeTitle = (title: string): string => {
  return title.replace(/\r?\n/g, ' ').trim()
}

const serializeQuadrantBlock = (heading: string, tasks: QuadrantTask[]): string | null => {
  const titles = tasks.map((task) => sanitizeTitle(task.title)).filter((title) => title !== '')

  if (titles.length === 0) return null

  const bullets = titles.map((title) => `- ${title}`).join('\n')

  return `${heading}\n${bullets}`
}

/**
 * Serializes the board's tasks into the same fixed markdown format the
 * parser accepts, so export then import round-trips (D1). Quadrants with
 * no tasks are left out rather than emitted as an empty heading.
 */
export const serializeMatrixMarkdown = (tasks: QuadrantTask[]): string => {
  const grouped = groupTasksByQuadrant(tasks)

  const blocks = QUADRANTS.map((quadrant) => {
    return serializeQuadrantBlock(`# Q${quadrant.id}: ${quadrant.title}`, grouped[quadrant.id])
  }).filter((block): block is string => block !== null)

  return `${blocks.join('\n\n')}\n`
}
