<script setup lang="ts">
import { pageNames } from '~/constants'
import type { DirectoryEntry } from '~/services/client-records'

definePageMeta({ middleware: 'is-authenticated' })
const route = useRoute()
const { $services } = useNuxtApp()
const workspace = useWorkspaceStore()
const id = computed(() => String(route.params.client_id))
const {
  data: client,
  error,
  status,
  refresh,
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
const removal = ref<{ section: 'staff' | 'locations'; entry: DirectoryEntry }>()
const deleting = ref(false)
const deleteError = ref('')
const notice = ref('')
function requestRemoval(section: 'staff' | 'locations', entry: DirectoryEntry) {
  deleteError.value = ''
  removal.value = { section, entry }
}

async function confirmRemoval() {
  if (!removal.value || deleting.value) return
  const { section, entry } = removal.value
  deleting.value = true
  deleteError.value = ''
  notice.value = ''
  try {
    await $services[section].remove(entry.id)
    removal.value = undefined
    notice.value = (entry.name || 'Record') + ' was removed.'
    await refresh()
  } catch {
    deleteError.value = 'Could not delete this record. Try again.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <v-progress-linear v-if="status === 'pending'" indeterminate />
    <v-alert v-else-if="error" type="error"
      >Could not load this client record.</v-alert
    >
    <div v-else-if="client" class="d-grid ga-4">
      <v-card flat class="pa-4">
        <div class="d-flex flex-wrap align-center ga-3 mb-4">
          <h2 class="text-h5">{{ client.name }}</h2>
          <v-btn :to="'/client-records/' + id + '/edit'" variant="outlined"
            >Edit client</v-btn
          >
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
      <v-alert
        v-if="notice"
        type="success"
        variant="tonal"
        closable
        @click:close="notice = ''"
        >{{ notice }}</v-alert
      >
      <v-card
        v-for="section in ['staff', 'locations'] as const"
        :key="section"
        flat
        class="pa-4"
      >
        <div
          class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2"
        >
          <h2 class="text-h6 text-capitalize">{{ section }}</h2>
          <v-btn
            :to="'/client-records/' + id + '/' + section + '/add'"
            variant="tonal"
            >{{ section === 'staff' ? 'Add staff' : 'Add location' }}</v-btn
          >
        </div>
        <v-list v-if="client[section]?.length" density="compact">
          <div
            v-for="entry in client[section]"
            :key="entry.id"
            class="d-flex align-center ga-2"
          >
            <v-list-item
              class="flex-grow-1"
              :title="entry.name"
              :subtitle="entry.designation || entry.website || entry.email"
              :to="'/client-records/' + id + '/' + section + '/' + entry.id"
            />
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              :aria-label="'Delete ' + (entry.name || 'record')"
              @click="requestRemoval(section, entry)"
            />
          </div>
        </v-list>
        <p v-else>No {{ section }} recorded.</p>
      </v-card>
    </div>
    <v-dialog
      :model-value="!!removal"
      :persistent="deleting"
      max-width="440"
      aria-labelledby="delete-record-title"
      @update:model-value="!$event && (removal = undefined)"
    >
      <v-card>
        <v-card-title id="delete-record-title"
          >Delete
          {{
            removal?.section === 'staff' ? 'staff member' : 'location'
          }}?</v-card-title
        >
        <v-card-text>
          Remove {{ removal?.entry.name || 'this record' }} from this client?
          <v-alert
            v-if="deleteError"
            type="error"
            variant="tonal"
            class="mt-3"
            >{{ deleteError }}</v-alert
          >
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="deleting" @click="removal = undefined"
            >Cancel</v-btn
          >
          <v-btn
            color="error"
            variant="flat"
            :loading="deleting"
            @click="confirmRemoval"
            >Delete</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
