<template>
  <v-row class="my-6" justify="center">
    <v-col cols="12" lg="4" md="6">
      <ClientRecordsForm
        @cancel="$router.push(`/client-records/`)"
      ></ClientRecordsForm>
    </v-col>
  </v-row>
</template>

<script>
import { defineComponent, useStore } from '@nuxtjs/composition-api'
import ClientRecordsForm from '@/components/forms/ClientRecordsForm.vue'
import { pageNames } from '~/shared/PageNames'
export default defineComponent({
  components: {
    ClientRecordsForm,
  },
  middleware: 'isAuthenticated',
  setup() {
    const breadcrumbs = [
      {
        text: `Dashboard`,
        to: `/`,
        disabled: false,
      },
      {
        text: pageNames.clients,
        to: `/client-records`,
        disabled: false,
      },
      {
        text: `Add client`,
        to: `/client-records/add`,
        disabled: true,
      },
    ]
    const store = useStore()
    const pageTitle = 'Add Client'
    store.dispatch('setPageHeading', { pageTitle, breadcrumbs })
  },
  head: {
    title: 'Add Client',
  },
})
</script>
