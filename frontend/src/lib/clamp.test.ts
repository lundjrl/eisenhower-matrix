import {describe, expect, it} from 'vitest'

import {clamp} from '~/lib/clamp'

describe('clamp', () => {
  it('returns the value unchanged when within range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })

  it('clamps to the minimum', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
  })

  it('clamps to the maximum', () => {
    expect(clamp(2, 0, 1)).toBe(1)
  })
})
