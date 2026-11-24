<template>
  <ReportsList class="workspace-report-hub" />
</template>

<script lang="ts">
import { defineComponent, useStore } from '@nuxtjs/composition-api'
import { pageNames } from '~/shared/PageNames'
import ReportsList from '~/components/ReportsList.vue'
import { IBreadcrumbs } from '~/store'

const pageTitle = pageNames.reports

export default defineComponent({
  components: {
    ReportsList,
  },
  middleware: 'isAuthenticated',
  setup() {
    const store = useStore()

    const breadcrumbs: IBreadcrumbs[] = [
      {
        text: 'Dashboard',
        to: `/`,
      },
      {
        text: pageNames.reports,
        to: '',
        disabled: true,
      },
    ]

    store.dispatch('setPageHeading', {
      pageTitle,
      breadcrumbs,
    })

    return {}
  },
  head: {
    title: pageTitle,
  },
})
</script>
