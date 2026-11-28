<script setup lang="ts">
definePageMeta({ middleware: 'is-authenticated' })
</script>

<template>
  <RecordsTeamMemberForm editing />
</template>
