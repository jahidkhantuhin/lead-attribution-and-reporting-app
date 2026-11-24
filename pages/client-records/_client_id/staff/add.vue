<template>
  <v-row class="my-6" justify="center">
    <v-col cols="12" lg="4" md="6">
      <staff-form
        @onFetchClient="onFetchClient"
        @cancel="handleCancel"
      ></staff-form>
    </v-col>
  </v-row>
</template>

<script>
import {
  defineComponent,
  useRoute,
  useRouter,
  useStore,
} from '@nuxtjs/composition-api'
import { pageNames } from '~/shared/PageNames'
import StaffForm from '~/components/forms/StaffForm.vue'

export default defineComponent({
  components: {
    StaffForm,
  },
  middleware: 'isAuthenticated',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const store = useStore()

    const clientId = route.value.params.client_id

    const handleCancel = () => {
      router.push(`/client-records/${clientId}`)
    }

    const onFetchClient = (client) => {
      const pageTitle = 'Add Client Staff Member'
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
          to: `/client-records/${clientId}`,
          disabled: false,
        },
        {
          text: 'Add Staff',
          to: `/client-records/${clientId}/staff/add`,
          disabled: true,
        },
      ]

      store.dispatch('setPageHeading', {
        pageTitle,
        breadcrumbs,
      })
    }

    return {
      handleCancel,
      onFetchClient,
    }
  },
  head: { title: 'Add Client Staff Member' },
})
</script>
