<template>
  <div class="record-editor">
    <staff-form
      :id="editId"
      @cancel="$router.push(`/client-records/${clientId}/staff/${editId}`)"
      @onFetchClient="onFetchClient"
    ></staff-form>
  </div>
</template>

<script>
import { defineComponent, useRoute, useStore } from '@nuxtjs/composition-api'
import { pageNames } from '~/shared/PageNames'
import StaffForm from '~/components/forms/StaffForm.vue'

export default defineComponent({
  components: {
    StaffForm,
  },
  middleware: 'isAuthenticated',
  setup() {
    const route = useRoute()
    const store = useStore()

    const id = route.value.params.staff_id
    const clientId = route.value.params.client_id

    const onFetchClient = (client, staff) => {
      const pageTitle = 'Edit Client Staff Member'

      store.dispatch('setPageHeading', {
        pageTitle,
        breadcrumbs: [
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
            text: 'Staff',
            to: `/client-records/${clientId}`,
            disabled: true,
          },
          {
            text: staff.name,
            to: `/client-records/${clientId}/staff/${staff.id}`,
            disabled: false,
          },
          {
            text: 'Edit',
            to: `/client-records/${clientId}/staff/${id}/edit`,
            disabled: true,
          },
        ],
      })
    }

    return {
      editId: id,
      clientId,
      onFetchClient,
    }
  },
  head: { title: 'Edit Client Staff Member' },
})
</script>
