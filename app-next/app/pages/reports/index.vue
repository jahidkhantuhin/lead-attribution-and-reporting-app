<script setup lang="ts">
import { pageNames } from '~/constants'

definePageMeta({ middleware: 'is-authenticated' })
useHead({ title: pageNames.reports })
useWorkspaceStore().setPageHeading({
  pageTitle: pageNames.reports,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: pageNames.reports, to: '', disabled: true },
  ],
})
</script>

<template>
  <ReportsList class="workspace-report-hub" />
</template>
