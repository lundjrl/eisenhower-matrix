<script lang="ts" setup>
import EisenhowerMatrix from '~/components/eisenhower-matrix.vue'
import ThemeToggle from '~/components/theme-toggle.vue'
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1>Eisenhower Matrix</h1>
      <ThemeToggle />
    </header>

    <EisenhowerMatrix />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.app__header h1 {
  margin: 0;
  font-size: 1.1rem;
}
</style>
