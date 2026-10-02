import {describe, expect, it} from 'vitest'

import {parseMatrixMarkdown} from '~/lib/parse-matrix-markdown'

describe('parseMatrixMarkdown', () => {
  it('parses bullets and checkboxes under matching quadrant headings', () => {
    const markdown = `# Q1
- Finish the report
- [ ] Call the vendor
- [x] Already done, still imports as a normal task

# Q2
- Plan next quarter`

    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual([
      {quadrant: 1, title: 'Finish the report'},
      {quadrant: 1, title: 'Call the vendor'},
      {quadrant: 1, title: 'Already done, still imports as a normal task'},
      {quadrant: 2, title: 'Plan next quarter'},
    ])
    expect(result.warnings).toEqual({skippedNestedBullets: 0, truncatedTitles: 0})
  })

  it('rejects a file with no recognizable quadrant headings', () => {
    const result = parseMatrixMarkdown('- just a bullet\n- another one')

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.reason).toMatch(/no.*headings/i)
  })

  it('rejects when the total item count is over the 200 limit, all-or-nothing', () => {
    const bullets = Array.from({length: 201}, (_, i) => `- Task ${i}`).join('\n')
    const markdown = `# Q1\n${bullets}`

    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.reason).toContain('201')
    expect(result.reason).toContain('200')
  })

  it('accepts exactly 200 items', () => {
    const bullets = Array.from({length: 200}, (_, i) => `- Task ${i}`).join('\n')
    const markdown = `# Q1\n${bullets}`

    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toHaveLength(200)
  })

  it('accepts trailing text after the Qn token (C1)', () => {
    const result = parseMatrixMarkdown('# Q1: Do First\n- A task')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual([{quadrant: 1, title: 'A task'}])
  })

  it('ignores nested bullets and reports a skipped count (C2)', () => {
    const markdown = `# Q1
- Top level task
  - nested, should be ignored
    - also nested`

    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual([{quadrant: 1, title: 'Top level task'}])
    expect(result.warnings.skippedNestedBullets).toBe(2)
  })

  it('imports checked boxes the same as any other item (C3)', () => {
    const result = parseMatrixMarkdown('# Q1\n- [x] Done already')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual([{quadrant: 1, title: 'Done already'}])
  })

  it('skips blank items, merges duplicate headings, and ignores stray prose (C4)', () => {
    const markdown = `Some stray prose before any heading

# Q1
- First task

Some stray prose between items
-
- Second task

# Q1
- Third task, same heading repeated`

    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual([
      {quadrant: 1, title: 'First task'},
      {quadrant: 1, title: 'Second task'},
      {quadrant: 1, title: 'Third task, same heading repeated'},
    ])
  })

  it('checks the 200-item limit before truncation or filtering (C5)', () => {
    const bullets = Array.from({length: 250}, (_, i) => `- Task ${i}`).join('\n')
    const markdown = `# Q1\n${bullets}`

    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(false)
  })

  it('truncates titles over 200 characters and reports a count (C6)', () => {
    const longTitle = 'x'.repeat(250)
    const result = parseMatrixMarkdown(`# Q1\n- ${longTitle}`)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items[0].title).toHaveLength(200)
    expect(result.warnings.truncatedTitles).toBe(1)
  })

  it('does not match an h2 heading like "## Q1"', () => {
    const result = parseMatrixMarkdown('## Q1\n- A task')

    expect(result.ok).toBe(false)
  })

  it('accepts trailing text after Qn separated by punctuation other than space or colon (C1)', () => {
    const result = parseMatrixMarkdown('# Q1-Do First\n- A task')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual([{quadrant: 1, title: 'A task'}])
  })

  it('does not treat a heading indented under other content as a real quadrant heading', () => {
    const result = parseMatrixMarkdown('- some item\n  # Q1\n- A task')

    expect(result.ok).toBe(false)
  })

  it('ignores a nested bullet even when there is no space after the dash, and still counts it (C2)', () => {
    const markdown = `# Q1
- Top level task
  -nested-no-space`

    const result = parseMatrixMarkdown(markdown)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.items).toEqual([{quadrant: 1, title: 'Top level task'}])
    expect(result.warnings.skippedNestedBullets).toBe(1)
  })
})
