import {describe, expect, it} from 'vitest'

import {resolveInitialTheme, toggleTheme} from '~/lib/theme'

describe('resolveInitialTheme', () => {
  it('returns the stored theme when it is valid', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark')
    expect(resolveInitialTheme('light', true)).toBe('light')
  })

  it('falls back to the system preference when nothing is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('ignores an invalid stored value and falls back to the system preference', () => {
    expect(resolveInitialTheme('neon', true)).toBe('dark')
  })
})

describe('toggleTheme', () => {
  it('flips light to dark and back', () => {
    expect(toggleTheme('light')).toBe('dark')
    expect(toggleTheme('dark')).toBe('light')
  })
})
