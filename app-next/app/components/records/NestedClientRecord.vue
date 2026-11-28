<script setup lang="ts">
import { pageNames } from '~/constants'
import { nestedRecordMatchesClient } from '~/services/client-records'

const props = defineProps<{ kind: 'locations' | 'staff' }>()
const route = useRoute()
const { $services } = useNuxtApp()
const workspace = useWorkspaceStore()
const id = computed(() => String(route.params.record_id))
const clientId = computed(() => String(route.params.client_id))
const clientUrl = computed(
  () => '/client-records/' + encodeURIComponent(clientId.value),
)
const editUrl = computed(
  () =>
    clientUrl.value +
    '/' +
    props.kind +
    '/' +
    encodeURIComponent(id.value) +
    '/edit',
)
const title = props.kind === 'staff' ? 'Staff Details' : 'Location Details'
const {
  data: entry,
  error,
  status,
} = await useAsyncData(
  () => props.kind + '-record-' + clientId.value + '-' + id.value,
  async () => {
    const owner = clientId.value
    const { data } = await $services[props.kind].byId(id.value)
    if (!nestedRecordMatchesClient(data.data, owner))
      throw new Error('Record does not belong to this client')
    return data.data
  },
  { server: false },
)
useHead({ title })
watchEffect(() =>
  workspace.setPageHeading({
    pageTitle: title,
    breadcrumbs: [
      { text: 'Dashboard', to: '/' },
      { text: pageNames.clients, to: '/client-records' },
      { text: 'Client Details', to: clientUrl.value },
      { text: entry.value?.name || title, to: '', disabled: true },
    ],
  }),
)
const fields = computed(() => {
  if (!entry.value) return []
  const labels =
    props.kind === 'staff'
      ? { designation: 'Designation', email: 'Email', phone_number: 'Phone' }
      : {
          status: 'Status',
          website: 'Website',
          address: 'Address',
          city: 'City',
          state: 'State',
          zipcode: 'ZIP code',
          phone_number: 'Phone',
          reporting_mail: 'Reporting email',
          account_manager: 'Account manager',
          adwords_budget: 'Google Ads budget',
          facebook_budget: 'Facebook budget',
          monthly_fee: 'Monthly fee',
          apexchat_id: 'Apex Chat ID',
          facebook_id: 'Facebook ID',
          adwords_id: 'Google Ads ID',
        }
  return Object.entries(labels).map(([key, label]) => {
    const value = entry.value?.[key]
    return {
      label,
      value:
        typeof value === 'string' || typeof value === 'number'
          ? value
          : undefined,
    }
  })
})
</script>

<template>
  <v-progress-linear v-if="status === 'pending'" indeterminate />
  <v-alert v-else-if="error" type="error">Could not load this record.</v-alert>
  <v-card v-else-if="entry" flat class="pa-4">
    <h2 class="text-h5 mb-4">{{ entry.name }}</h2>
    <RecordsRecordFacts :fields="fields" />
    <v-btn :to="editUrl" color="primary" variant="tonal" class="mt-4 me-2"
      >Edit record</v-btn
    >
    <v-btn :to="clientUrl" variant="outlined" class="mt-4"
      >Back to client</v-btn
    >
    <RecordsLocationActivity v-if="kind === 'locations'" :record="entry" />
  </v-card>
</template>
