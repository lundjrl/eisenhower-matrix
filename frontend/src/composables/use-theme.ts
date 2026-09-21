import {onMounted, ref} from 'vue'

import {resolveInitialTheme, toggleTheme as flipTheme, type Theme} from '~/lib/theme'

const STORAGE_KEY = 'eisenhower-matrix-theme'

const theme = ref<Theme>('light')

const applyTheme = (next: Theme): void => {
  document.documentElement.setAttribute('data-theme', next)
}

export const useTheme = () => {
  onMounted(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    theme.value = resolveInitialTheme(localStorage.getItem(STORAGE_KEY), prefersDark)
    applyTheme(theme.value)
  })

  const toggleTheme = (): void => {
    theme.value = flipTheme(theme.value)

    localStorage.setItem(STORAGE_KEY, theme.value)
    applyTheme(theme.value)
  }

  return {theme, toggleTheme}
}
