import {describe, expect, it} from 'vitest'

import {cascadePosition} from '~/lib/cascade-position'

describe('cascadePosition', () => {
  it('starts near the top-left of the quadrant for the first task', () => {
    expect(cascadePosition(0)).toEqual({x: 0.12, y: 0.2})
  })

  it('staggers each subsequent task diagonally', () => {
    const first = cascadePosition(0)
    const second = cascadePosition(1)

    expect(second.x).toBeGreaterThan(first.x)
    expect(second.y).toBeGreaterThan(first.y)
  })

  it('wraps back to the start after 6 tasks to stay within the quadrant', () => {
    expect(cascadePosition(6)).toEqual(cascadePosition(0))
  })
})
