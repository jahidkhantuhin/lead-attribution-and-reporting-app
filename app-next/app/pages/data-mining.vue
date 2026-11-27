<script setup lang="ts">
definePageMeta({ middleware: 'is-authenticated' })
const route = useRoute()
await navigateTo(
  { path: '/reports/statistics', query: route.query },
  { replace: true },
)
</script>

<template>
  <div>redirecting...</div>
</template>
