<script setup lang="ts">
import { pageNames } from '~/constants'
import type { RecordId } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = 'Assign locations'
useHead({ title })
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: pageNames.locationSetup, to: '/location-settings' },
    { text: title, to: '', disabled: true },
  ],
})
const { $services } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const allowed = computed(() => session.isAllowed('create report'))
type Option = { title: string; value: RecordId }
const clients = ref<Option[]>([])
const locations = ref<Option[]>([])
const client = ref<RecordId | null>(null)
const selected = ref<RecordId[]>([])
const loading = ref(false)
const saving = ref(false)
const unavailable = ref(false)
const error = ref('')
let pending = 0

watch(
  [() => route.query.id, allowed],
  async ([id, canView]) => {
    const ticket = ++pending
    if (!canView) return
    loading.value = true
    unavailable.value = false
    error.value = ''
    selected.value = []
    try {
      const [clientResult, locationResult] = await Promise.all([
        $services.clients.list({ limit: 200, sort_by: 'name:asc' }),
        id && typeof id === 'string'
          ? $services.locations.byId(id).then(({ data }) => data.data)
          : $services.locations
              .missingClients({ limit: 200 })
              .then(({ data }) => data.data.result),
      ])
      if (ticket !== pending) return
      clients.value = clientResult.data.data.result.map(({ id, name }) => ({
        title: name || String(id),
        value: id,
      }))
      const entries = Array.isArray(locationResult)
        ? locationResult
        : [locationResult]
      locations.value = entries
        .filter((entry) => !entry.client_id && !entry.client)
        .map(({ id, name }) => ({ title: name || String(id), value: id }))
      if (typeof id === 'string')
        selected.value = locations.value.map(({ value }) => value)
    } catch {
      if (ticket === pending) unavailable.value = true
    } finally {
      if (ticket === pending) loading.value = false
    }
  },
  { immediate: true },
)

async function assign() {
  if (
    !allowed.value ||
    loading.value ||
    unavailable.value ||
    saving.value ||
    !client.value ||
    !selected.value.length
  )
    return
  saving.value = true
  error.value = ''
  try {
    await $services.locations.assignClient({
      client_id: client.value,
      location_ids: selected.value,
    })
    await router.push('/location-settings')
  } catch {
    error.value = 'Could not assign these locations. Try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-alert v-if="!allowed" type="warning" variant="tonal"
    >You do not have access to location setup.</v-alert
  >
  <v-card v-else flat class="pa-4">
    <h2 class="text-h6 mb-4">Assign locations to a client</h2>
    <v-progress-linear v-if="loading" indeterminate />
    <v-alert v-else-if="unavailable" type="error" variant="tonal"
      >Could not load assignment options.</v-alert
    >
    <v-alert v-else-if="!locations.length" type="info" variant="tonal"
      >There are no unassigned locations to select.</v-alert
    >
    <v-form v-else :disabled="saving" @submit.prevent="assign">
      <v-autocomplete
        v-model="client"
        :items="clients"
        label="Client"
        aria-required="true"
        density="compact"
        variant="outlined"
      />
      <v-autocomplete
        v-model="selected"
        :items="locations"
        label="Locations"
        :readonly="typeof route.query.id === 'string'"
        aria-required="true"
        density="compact"
        variant="outlined"
        multiple
        chips
      />
      <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{
        error
      }}</v-alert>
      <div class="d-flex flex-wrap justify-end ga-2">
        <v-btn to="/location-settings" variant="text" :disabled="saving"
          >Cancel</v-btn
        >
        <v-btn
          type="submit"
          color="primary"
          :loading="saving"
          :disabled="!client || !selected.length"
          >Assign locations</v-btn
        >
      </div>
    </v-form>
  </v-card>
</template>
