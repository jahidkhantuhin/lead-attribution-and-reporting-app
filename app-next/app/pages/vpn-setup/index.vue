<script setup lang="ts">
import { pageNames } from '~/constants'
import type { SiteRecord } from '~/services/site-records'
import type { RecordId, VpnEntry } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = pageNames.vpn
useHead({ title })
const session = useSessionStore()
const allowed = computed(() => session.isAllowed('view vpn setup'))
const isSuperAdmin = computed(
  () => session.roles?.includes('super admin') ?? false,
)
const canEditIp = computed(
  () => isSuperAdmin.value || (session.roles?.includes('admin') ?? false),
)
const home = session.isAllowed('create report') ? '/' : '/reports'
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: home },
    { text: title, to: '', disabled: true },
  ],
})
const { $services } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const sizes = [20, 50, 100, 500]
const limit = computed(
  () => sizes.find((value) => value === Number(route.query.itemsPerPage)) ?? 20,
)
const page = computed(() =>
  Math.max(1, Math.floor(Number(route.query.page)) || 1),
)
const rows = ref<VpnEntry[]>([])
const total = ref(0)
const loading = ref(false)
const listError = ref(false)
const selection = ref<string | null>(null)
const search = ref('')
const websites = ref<SiteRecord[]>([])
const looking = ref(false)
const searchError = ref(false)
const duration = ref<number | null>(null)
const ip = ref('')
const fromVpn = ref(false)
const ipError = ref(false)
const checkingIp = ref(false)
const saving = ref(false)
const removal = ref<VpnEntry>()
const removing = ref(false)
const removalError = ref(false)
const failure = ref('')
const notice = ref('')
let request = 0
const durations = [
  { title: '72 hours', value: 72 },
  { title: '96 hours', value: 96 },
]
const validIp = computed(
  () =>
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip.value) &&
    ip.value.split('.').every((part) => Number(part) <= 255),
)
const valid = computed(() =>
  Boolean(
    selection.value &&
    durations.some(({ value }) => value === duration.value) &&
    validIp.value,
  ),
)
const date = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function dateLabel(value?: string) {
  const timestamp = value ? Date.parse(value) : NaN
  return Number.isFinite(timestamp) ? date.format(timestamp) : '—'
}

async function load() {
  const ticket = ++request
  if (!allowed.value) return
  loading.value = true
  listError.value = false
  try {
    const { data } = await $services.vpn.list({
      page: page.value,
      limit: limit.value,
    })
    if (ticket !== request) return
    rows.value = data.data.result
    total.value = data.data.pagination.total
  } catch {
    if (ticket === request) listError.value = true
  } finally {
    if (ticket === request) loading.value = false
  }
}

async function checkIp() {
  if (!allowed.value || checkingIp.value) return
  checkingIp.value = true
  ipError.value = false
  try {
    const { data } = await $services.vpn.publicIp()
    if (typeof data.ip !== 'string' || !data.ip)
      throw new Error('IP unavailable')
    fromVpn.value = ['34.238.213.152', '54.179.205.95'].includes(data.ip)
    ip.value = data.ip
  } catch {
    ipError.value = true
  } finally {
    checkingIp.value = false
  }
}

watch([limit, page, allowed], load, { immediate: true })
watch(allowed, checkIp, { immediate: true })
watch(search, (value, _old, cleanup) => {
  const name = value?.trim()
  if (name === selection.value || !allowed.value) return
  websites.value = []
  searchError.value = false
  looking.value = Boolean(name)
  if (!name) return
  let current = true
  const timer = setTimeout(async () => {
    try {
      const { data } = await $services.sites.list({
        name,
        date_start: '2022-08-01',
        date_end: '2022-08-31',
      })
      if (current) websites.value = data.data.result.filter((site) => site.url)
    } catch {
      if (current) searchError.value = true
    } finally {
      if (current) looking.value = false
    }
  }, 300)
  cleanup(() => {
    current = false
    clearTimeout(timer)
    looking.value = false
  })
})

function change(params: Record<string, RecordId>) {
  return router.push({ query: { ...route.query, page: '1', ...params } })
}

async function grant() {
  if (
    !allowed.value ||
    !valid.value ||
    fromVpn.value ||
    checkingIp.value ||
    saving.value
  )
    return
  saving.value = true
  failure.value = ''
  notice.value = ''
  try {
    await $services.vpn.request({
      url: selection.value,
      number_of_hours: duration.value,
      ip: ip.value,
    })
    notice.value = 'VPN access requested.'
    await load()
  } catch {
    failure.value = 'Could not request VPN access. Try again.'
  } finally {
    saving.value = false
  }
}

function openRemoval(row: VpnEntry) {
  removalError.value = false
  removal.value = row
}

async function remove() {
  if (!allowed.value || !isSuperAdmin.value || !removal.value || removing.value)
    return
  removing.value = true
  removalError.value = false
  notice.value = ''
  try {
    await $services.vpn.remove(removal.value.id)
    removal.value = undefined
    notice.value = 'VPN access removed.'
    await load()
  } catch {
    removalError.value = true
  } finally {
    removing.value = false
  }
}
</script>

<template>
  <div class="d-grid ga-4">
    <v-alert v-if="!allowed" type="warning" variant="tonal"
      >You do not have access to VPN setup.</v-alert
    >
    <template v-else>
      <v-alert
        v-if="fromVpn || ipError"
        :type="fromVpn ? 'warning' : 'info'"
        variant="tonal"
      >
        {{
          fromVpn
            ? 'Disconnect from the VPN before adding an IP address.'
            : 'Could not detect your public IP address.'
        }}
        <v-btn variant="text" :loading="checkingIp" @click="checkIp"
          >Refresh status</v-btn
        >
      </v-alert>
      <v-card flat class="pa-4">
        <h2 class="text-h6 mb-3">Request VPN access</h2>
        <v-form class="vpn-fields" @submit.prevent="grant">
          <v-autocomplete
            v-model="selection"
            v-model:search="search"
            :items="websites"
            item-title="url"
            item-value="url"
            label="Website"
            no-filter
            density="compact"
            :loading="looking"
            :error-messages="searchError ? 'Could not search websites.' : []"
            clearable
          />
          <v-select
            v-model="duration"
            :items="durations"
            label="Access duration"
            density="compact"
          />
          <v-text-field
            v-model="ip"
            label="IP address"
            density="compact"
            :readonly="!canEditIp"
            :loading="checkingIp"
            :error-messages="
              ip && !validIp ? 'Enter a valid IPv4 address.' : []
            "
          />
          <v-btn
            type="submit"
            color="primary"
            :loading="saving"
            :disabled="!valid || fromVpn || checkingIp"
            >Request access</v-btn
          >
        </v-form>
        <v-alert v-if="failure" type="error" variant="tonal">{{
          failure
        }}</v-alert>
        <v-alert
          v-if="notice"
          type="success"
          variant="tonal"
          closable
          @click:close="notice = ''"
          >{{ notice }}</v-alert
        >
      </v-card>
      <v-card flat class="pa-4">
        <div
          class="d-flex align-center justify-space-between flex-wrap ga-3 mb-3"
        >
          <div>
            <h2 class="text-h6">VPN activity log</h2>
            <p>{{ total }} {{ total === 1 ? 'entry' : 'entries' }}</p>
          </div>
          <v-select
            :model-value="limit"
            :items="sizes"
            label="Per page"
            density="compact"
            hide-details
            class="flex-grow-0"
            @update:model-value="change({ itemsPerPage: $event })"
          />
        </div>
        <v-progress-linear v-if="loading" indeterminate />
        <v-alert v-else-if="listError" type="error" variant="tonal"
          >Could not load VPN activity.</v-alert
        >
        <v-alert v-else-if="!rows.length" type="info" variant="tonal"
          >No VPN activity to display.</v-alert
        >
        <v-table v-else density="compact">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Status</th>
              <th scope="col">Website</th>
              <th scope="col">IP address</th>
              <th scope="col">Expires</th>
              <th v-if="isSuperAdmin" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <th scope="row">
                {{
                  [row.user?.first_name, row.user?.last_name]
                    .filter(Boolean)
                    .join(' ') || '—'
                }}
              </th>
              <td>
                <v-chip
                  v-if="row.user?.status != null"
                  size="small"
                  variant="tonal"
                  >{{
                    ['1', 'active'].includes(String(row.user.status))
                      ? 'Active'
                      : ['0', 'inactive'].includes(String(row.user.status))
                        ? 'Inactive'
                        : row.user.status
                  }}</v-chip><span v-else>—</span>
              </td>
              <td>{{ row.site?.url || '—' }}</td>
              <td>{{ row.ip || '—' }}</td>
              <td>{{ dateLabel(row.expiry_date) }}</td>
              <td v-if="isSuperAdmin">
                <v-btn size="small" variant="text" @click="openRemoval(row)"
                  >Remove access</v-btn
                >
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-pagination
          v-if="total > limit"
          :model-value="page"
          :length="Math.ceil(total / limit)"
          :total-visible="4"
          @update:model-value="change({ page: $event })"
        />
      </v-card>
      <v-dialog
        :model-value="!!removal"
        :persistent="removing"
        max-width="440"
        aria-labelledby="vpn-remove-title"
        @update:model-value="!$event && (removal = undefined)"
      >
        <v-card>
          <v-card-title id="vpn-remove-title">Remove VPN access?</v-card-title>
          <v-card-text>
            Remove access for {{ removal?.ip || 'this IP address' }}?
            <v-alert
              v-if="removalError"
              type="error"
              variant="tonal"
              class="mt-3"
              >Could not remove VPN access. Try again.</v-alert
            >
          </v-card-text>
          <v-card-actions
            ><v-spacer /><v-btn
              :disabled="removing"
              @click="removal = undefined"
              >Cancel</v-btn
            ><v-btn color="error" :loading="removing" @click="remove"
              >Remove</v-btn
            ></v-card-actions
          >
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>

<style scoped>
.vpn-fields {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 900px) {
  .vpn-fields {
    grid-template-columns: minmax(0, 2fr) repeat(2, minmax(0, 1fr)) auto;
    align-items: start;
  }
}
</style>
