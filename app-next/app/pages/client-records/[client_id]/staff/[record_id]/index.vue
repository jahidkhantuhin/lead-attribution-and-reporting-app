<script setup lang="ts">
definePageMeta({ middleware: 'is-authenticated' })
</script>

<template>
  <RecordsNestedClientRecord kind="staff" />
</template>
