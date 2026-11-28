<script setup lang="ts">
definePageMeta({ middleware: 'is-authenticated' })
</script>

<template>
  <RecordsClientRecordForm kind="staff" editing />
</template>
