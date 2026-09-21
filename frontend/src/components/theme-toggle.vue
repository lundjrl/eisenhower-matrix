<script lang="ts" setup>
import {Moon, Sun} from '@lucide/vue'

import {useTheme} from '~/composables/use-theme'

const {theme, toggleTheme} = useTheme()
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <Sun v-if="theme === 'dark'" :size="18" />
    <Moon v-else :size="18" />
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  color: var(--text-color);
  cursor: pointer;
}

.theme-toggle:hover {
  background: var(--surface-hover-color);
}
</style>
