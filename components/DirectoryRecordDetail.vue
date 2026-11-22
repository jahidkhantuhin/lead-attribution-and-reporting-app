<template>
  <section
    class="directory-detail"
    :aria-label="isClient ? 'Selected client' : 'Selected location'"
  >
    <header class="directory-detail-heading">
      <h2>{{ displayName }}</h2>
      <workspace-badge :value="data.status" />
    </header>
    <p v-if="loading" role="status">Loading record details…</p>
    <p v-else-if="failed" role="status">Additional details are unavailable.</p>
    <dl class="directory-detail-fields">
      <div v-for="field in fields" :key="field.label">
        <dt>{{ field.label }}</dt>
        <dd>{{ field.value }}</dd>
      </div>
      <div v-if="data.updated_at">
        <dt>Last updated</dt>
        <dd><formatted-date :date="data.updated_at" /></dd>
      </div>
    </dl>
    <template v-if="isClient && !loading && !failed">
      <h3>Locations</h3>
      <ul v-if="locations.length" class="directory-related">
        <li v-for="location in locations" :key="location.id">
          <nuxt-link :to="recordPath + '/locations/' + location.id">{{
            location.name
          }}</nuxt-link>
          <workspace-badge :value="location.status" />
        </li>
      </ul>
      <p v-else>No locations linked.</p>

      <h3>Staff</h3>
      <ul v-if="staff.length" class="directory-related">
        <li v-for="member in staff" :key="member.id">
          <nuxt-link :to="recordPath + '/staff/' + member.id">{{
            member.name
          }}</nuxt-link>
          <span v-if="member.designation">{{ member.designation }}</span>
        </li>
      </ul>
      <p v-else>No staff linked.</p>
    </template>
    <div class="directory-detail-actions">
      <v-btn v-if="recordPath" text color="primary" :to="recordPath">{{
        isClient ? 'Open full client record' : 'Open full location record'
      }}</v-btn>
      <v-btn
        v-else
        text
        color="primary"
        :to="{
          path: '/location-settings/add',
          query: { id: record.id, name: displayName },
        }"
        >Assign to client</v-btn
      >
      <v-btn v-if="isClient" text color="primary" :to="recordPath + '/edit'"
        >Edit client</v-btn
      >
    </div>
  </section>
</template>

<script>
import {
  computed,
  defineComponent,
  onMounted,
  ref,
} from '@nuxtjs/composition-api'
import useClientRecords from '~/services/useClientRecords'
import useClientLocations from '~/services/useClientLocations'

export default defineComponent({
  props: {
    record: { type: Object, required: true },
    kind: { type: String, required: true },
  },
  setup(props) {
    const isClient = props.kind === 'client'
    const fetch = isClient
      ? useClientRecords().clientById
      : useClientLocations().locationById
    const detail = ref({})
    const loading = ref(true)
    const failed = ref(false)
    const data = computed(() => ({ ...props.record, ...detail.value }))
    const displayName = computed(
      () =>
        data.value.name ||
        [data.value.first_name, data.value.last_name]
          .filter(Boolean)
          .join(' ') ||
        'Unnamed record'
    )
    const recordPath = computed(() => {
      if (isClient) return '/client-records/' + props.record.id
      const clientId = data.value.client?.id || data.value.client_id
      return clientId
        ? '/client-records/' + clientId + '/locations/' + props.record.id
        : ''
    })
    const fields = computed(() => {
      const record = data.value
      const client = record.client
      const manager = record.account_manager
      const clientName = typeof client === 'string' ? client : client?.name
      const managerName =
        typeof manager === 'string'
          ? manager
          : manager?.fullname ||
            [manager?.first_name, manager?.last_name].filter(Boolean).join(' ')
      const address = [
        record.address,
        [record.city, record.state].filter(Boolean).join(', '),
        record.zipcode || record.zip,
      ]
        .filter(Boolean)
        .join(' · ')

      return [
        !isClient && { label: 'Client', value: clientName || 'Unassigned' },
        { label: 'Account manager', value: managerName },
        {
          label: 'Email',
          value: isClient
            ? record.email
            : record.reporting_mail || record.email,
        },
        { label: 'Phone', value: record.phone_number },
        { label: 'Address', value: address },
        { label: 'Website', value: record.website || record.personal_website },
        !isClient && { label: 'Source', value: record.source },
      ].filter((field) => field && field.value)
    })
    const locations = computed(() =>
      Array.isArray(data.value.locations) ? data.value.locations : []
    )
    const staff = computed(() =>
      Array.isArray(data.value.staff) ? data.value.staff : []
    )

    onMounted(async () => {
      try {
        const response = await fetch(props.record.id)
        detail.value = response.data.data || {}
      } catch {
        failed.value = true
      } finally {
        loading.value = false
      }
    })

    return {
      isClient,
      data,
      displayName,
      recordPath,
      fields,
      locations,
      staff,
      loading,
      failed,
    }
  },
})
</script>

<style scoped>
.directory-detail {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
}
.directory-detail-heading,
.directory-detail-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.directory-detail-heading h2 {
  font-size: 1.25rem;
  overflow-wrap: anywhere;
}
.directory-detail-fields {
  margin: 12px 0;
}
.directory-detail-fields > div {
  display: grid;
  grid-template-columns: minmax(95px, 0.65fr) minmax(0, 1fr);
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--workspace-border);
}
.directory-detail-fields dt,
.directory-related li > span:not(.workspace-badge) {
  color: var(--workspace-muted);
}
.directory-detail-fields dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.directory-related {
  list-style: none;
  padding: 0 !important;
  margin: 4px 0 14px;
}
.directory-related li {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--workspace-border);
}
.directory-detail-actions {
  justify-content: flex-start;
  margin-top: 12px;
}
</style>
