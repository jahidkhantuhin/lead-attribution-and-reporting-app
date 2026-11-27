<script setup lang="ts">
definePageMeta({ middleware: 'is-authenticated' })
useHead({ title: 'Search' })
useWorkspaceStore().setPageHeading({
  pageTitle: 'Search',
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: 'Search', to: '/search' },
  ],
})
</script>

<template>
  <v-card elevation="1">
    <v-card-text>
      <p>Not implemented yet.</p>
      <v-btn variant="flat" to="/">Home page</v-btn>
    </v-card-text>
  </v-card>
</template>
