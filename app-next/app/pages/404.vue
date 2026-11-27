<script setup lang="ts">
useHead({ title: 'Page not found' })
useWorkspaceStore().setPageHeading({
  pageTitle: 'Page not found',
  breadcrumbs: [],
})
</script>

<template>
  <NotFound />
</template>
