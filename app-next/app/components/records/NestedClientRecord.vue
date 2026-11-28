<script setup lang="ts">
import { pageNames } from '~/constants'

const props = defineProps<{ kind: 'locations' | 'staff' }>()
const route = useRoute()
const { $services } = useNuxtApp()
const workspace = useWorkspaceStore()
const id = computed(() => String(route.params.record_id))
const clientUrl = computed(() => '/client-records/' + route.params.client_id)
const title = props.kind === 'staff' ? 'Staff Details' : 'Location Details'
const {
  data: entry,
  error,
  status,
} = await useAsyncData(
  () => props.kind + '-record-' + id.value,
  async () => (await $services[props.kind].byId(id.value)).data.data,
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
    <v-btn :to="clientUrl" variant="outlined" class="mt-4"
      >Back to client</v-btn
    >
  </v-card>
</template>
