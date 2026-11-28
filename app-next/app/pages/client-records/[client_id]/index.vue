<script setup lang="ts">
import { pageNames } from '~/constants'

definePageMeta({ middleware: 'is-authenticated' })
const route = useRoute()
const { $services } = useNuxtApp()
const workspace = useWorkspaceStore()
const id = computed(() => String(route.params.client_id))
const {
  data: client,
  error,
  status,
} = await useAsyncData(
  () => 'client-record-' + id.value,
  async () => (await $services.clients.byId(id.value)).data.data,
  { server: false },
)
useHead({ title: 'Client Details' })
watchEffect(() =>
  workspace.setPageHeading({
    pageTitle: 'Client Details',
    breadcrumbs: [
      { text: 'Dashboard', to: '/' },
      { text: pageNames.clients, to: '/client-records' },
      { text: client.value?.name || 'Client Details', to: '', disabled: true },
    ],
  }),
)
</script>

<template>
  <v-progress-linear v-if="status === 'pending'" indeterminate />
  <v-alert v-else-if="error" type="error"
    >Could not load this client record.</v-alert
  >
  <div v-else-if="client" class="d-grid ga-4">
    <v-card flat class="pa-4">
      <div class="d-flex flex-wrap align-center ga-3 mb-4">
        <h2 class="text-h5">{{ client.name }}</h2>
        <v-chip v-if="client.status" size="small" variant="tonal">{{
          client.status.replaceAll('_', ' ')
        }}</v-chip>
      </div>
      <RecordsRecordFacts
        :fields="[
          { label: 'Email', value: client.email },
          { label: 'Address', value: client.address },
          { label: 'City', value: client.city },
          { label: 'State', value: client.state },
          { label: 'ZIP code', value: client.zipcode },
        ]"
      />
    </v-card>
    <v-card
      v-for="section in ['staff', 'locations'] as const"
      :key="section"
      flat
      class="pa-4"
    >
      <h2 class="text-h6 text-capitalize mb-2">{{ section }}</h2>
      <v-list v-if="client[section]?.length" density="compact">
        <v-list-item
          v-for="entry in client[section]"
          :key="entry.id"
          :title="entry.name"
          :subtitle="entry.designation || entry.website || entry.email"
          :to="'/client-records/' + id + '/' + section + '/' + entry.id"
          append-icon="mdi-chevron-right"
        />
      </v-list>
      <p v-else>No {{ section }} recorded.</p>
    </v-card>
  </div>
</template>
