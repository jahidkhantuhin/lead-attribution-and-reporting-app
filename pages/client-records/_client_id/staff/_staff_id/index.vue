<template>
  <div class="workspace-record-stack">
    <staff-details :loading="busy" :staff-data="staffData"></staff-details>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  useRoute,
  useStore,
  ref,
  onMounted,
} from '@nuxtjs/composition-api'
import { pageNames } from '~/shared/PageNames'

import useClientStaff from '~/services/useClientStaff'
import StaffDetails from '~/components/ClientRecords/StaffDetails.vue'

export default defineComponent({
  components: {
    StaffDetails,
  },
  middleware: 'isAuthenticated',
  setup() {
    const route = useRoute()
    const store = useStore()

    const staffData = ref({})
    const busy = ref(false)

    const { staffById } = useClientStaff()

    const staffID = route.value.params.staff_id
    const clientId = route.value.params.client_id
    const pageTitle = 'Staff Member Details'

    const fetchStaff = () => {
      busy.value = true

      staffById(staffID)
        .then((res) => {
          staffData.value = res.data.data

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
                text: (staffData.value as any).client.name,
                to: `/client-records/${clientId}`,
                disabled: false,
              },
              {
                text: 'Staff',
                to: `/client-records/${clientId}`,
                disabled: true,
              },
              {
                text: (staffData.value as any).name,
                to: `/client-records/${clientId}/staff/${staffID}`,
                disabled: true,
              },
            ],
          })
        })
        .finally(() => {
          busy.value = false
        })
    }

    onMounted(() => {
      fetchStaff()
    })

    return {
      staffData,
      busy,
      clientId,
      staffID,
    }
  },
  head: { title: 'Staff Member Details' },
})
</script>
