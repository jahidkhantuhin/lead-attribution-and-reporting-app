<template>
  <div class="record-editor">
    <ClientRecordsForm
      :id="clientId"
      @onFetchClient="onFetchClient"
      @cancel="$router.push(`/client-records/${clientId}/`)"
    ></ClientRecordsForm>
  </div>
</template>

<script>
import { defineComponent, useRouter, useStore } from '@nuxtjs/composition-api'
import ClientRecordsForm from '@/components/forms/ClientRecordsForm.vue'
import { pageNames } from '~/shared/PageNames'
export default defineComponent({
  components: {
    ClientRecordsForm,
  },
  middleware: 'isAuthenticated',
  setup() {
    const router = useRouter()
    const store = useStore()

    const onFetchClient = (client) => {
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
          text: client.name,
          to: `/client-records/${router.currentRoute.params.client_id}`,
          disabled: false,
        },
        {
          text: `Edit`,
          to: `/client-records/${router.currentRoute.params.client_id}/edit`,
          disabled: true,
        },
      ]

      const pageTitle = 'Edit Client'
      store.dispatch('setPageHeading', { pageTitle, breadcrumbs })
    }

    return {
      clientId: router.currentRoute.params.client_id,
      onFetchClient,
    }
  },
  head: {
    title: 'Edit Client',
  },
})
</script>
