<template>
  <header class="workspace-result-heading">
    <div class="workspace-result-context">
      <h2>{{ title }}</h2>
      <slot />
    </div>
    <div v-if="$slots.actions" class="workspace-result-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script>
export default {
  props: {
    title: { type: String, required: true },
  },
}
</script>
