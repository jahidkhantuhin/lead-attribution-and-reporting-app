<script setup lang="ts">
defineProps<{ fields: { label: string; value?: string | number | null }[] }>()
</script>

<template>
  <dl class="record-facts">
    <div v-for="field in fields" :key="field.label">
      <dt>{{ field.label }}</dt>
      <dd>{{ field.value === '' ? '—' : (field.value ?? '—') }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.record-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: 0.75rem 1.5rem;
}
dt {
  font-size: 0.75rem;
  font-weight: 600;
}
dd {
  overflow-wrap: anywhere;
}
</style>
