<template>
  <div class="workspace-record-stack">
    <v-card v-if="apiStatus === 200" :loading="busy" flat>
      <ReportResultHeading :title="clientData.name || 'Client details'">
        <workspace-badge v-if="clientData.status" :value="clientData.status" />
        <template #actions>
          <v-btn small outlined to="/client-records">All clients</v-btn>
          <v-btn
            small
            depressed
            color="primary"
            :to="`/client-records/${clientData.id}/edit`"
          >
            <v-icon small left>mdi-pencil-outline</v-icon> Edit client
          </v-btn>
        </template>
      </ReportResultHeading>
      <RecordFacts
        :fields="[
          { label: 'Email', value: clientData.email },
          { label: 'Address', value: clientData.address },
          { label: 'City', value: clientData.city },
          { label: 'State', value: clientData.state },
          { label: 'ZIP code', value: clientData.zipcode },
        ]"
      />
      <staff-list
        :loading="busy"
        :list="clientData.staff ? clientData.staff : []"
        @fetchClient="getClient"
      ></staff-list>
      <location-list
        :loading="busy"
        :list="clientData.locations ? clientData.locations : []"
        @fetchClient="getClient"
      ></location-list>
    </v-card>
    <v-card v-else-if="apiStatus === 404">
      <v-card-text>
        <v-alert type="error">
          The client you're looking for cannot be found.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn to="/client-records" small>Show all clients</v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>
<script lang="ts">
import {
  defineComponent,
  useStore,
  ref,
  useRouter,
  onMounted,
} from '@nuxtjs/composition-api'
import { pageNames } from '~/shared/PageNames'

import useClientRecords from '~/services/useClientRecords'
import StaffList from '~/components/ClientRecords/StaffList.vue'
import LocationList from '~/components/ClientRecords/LocationList.vue'
// import LocationDetails from '~/components/ClientRecords/LocationDetails.vue'

export default defineComponent({
  components: {
    StaffList,
    LocationList,
  },
  middleware: 'isAuthenticated',
  setup() {
    const store = useStore()
    const busy = ref(false)
    const router = useRouter()
    const clientData = ref({})
    const { clientById } = useClientRecords()
    const apiStatus = ref(200)

    // set the page breadcrumbs
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
    ]

    const pageTitle = 'Client Details'

    const getClient = () => {
      busy.value = true
      clientById(router.currentRoute.params.client_id)
        .then((resp) => {
          clientData.value = resp.data.data

          breadcrumbs.push(
            {
              text:
                (clientData.value as any).last_name +
                ',' +
                ' ' +
                (clientData.value as any).first_name,
              to: `/client-records/${(clientData.value as any).id}`,
              disabled: true,
            },
            {
              text: (clientData.value as any).last_name + ' ' + 'Details',
              to: ``,
              disabled: true,
            }
          )

          store.dispatch('setPageHeading', { pageTitle, breadcrumbs })
        })
        .catch((err) => {
          apiStatus.value = err.response.status
        })
        .finally(() => (busy.value = false))
    }

    onMounted(() => {
      getClient()
    })

    return {
      busy,
      clientData,
      apiStatus,
      getClient,
    }
  },
  head: { title: 'Client Details' },
})
</script>
