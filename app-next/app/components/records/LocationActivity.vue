<script setup lang="ts">
import { locationActivityFields } from '~/services/location-activity'
import type { Fields } from '~/types/api'

const props = defineProps<{ record: Fields }>()
function isRecord(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function records(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : []
}
function display(value: unknown) {
  return typeof value === 'number' ||
    (typeof value === 'string' && value.trim())
    ? String(value)
    : '—'
}
const date = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const history = computed(() =>
  records(props.record.location_activity_logs).map((event) => {
    const before = isRecord(event.old_data) ? event.old_data : {}
    const after = isRecord(event.new_data) ? event.new_data : {}
    const user = isRecord(event.user) ? event.user : {}
    const timestamp =
      typeof after.updated_at === 'string' ? Date.parse(after.updated_at) : NaN
    const fields = Object.entries(locationActivityFields)
      .filter(([key]) => key in before || key in after)
      .map(([key, label]) => {
        const previous = display(before[key])
        const next = key in after ? display(after[key]) : previous
        return { key, label, previous, next, changed: previous !== next }
      })
    return {
      actor:
        [user.first_name, user.last_name]
          .filter((value) => typeof value === 'string')
          .join(' ') || 'Location updated',
      comment: typeof event.comment === 'string' ? event.comment : '',
      time: Number.isFinite(timestamp) ? date.format(timestamp) : '',
      fields,
    }
  }),
)
const trackingNumbers = computed(() => records(props.record.phone_numbers))
</script>

<template>
  <v-expansion-panels class="mt-4">
    <v-expansion-panel title="Tracking numbers">
      <v-expansion-panel-text>
        <v-table v-if="trackingNumbers.length" density="compact">
          <thead>
            <tr>
              <th scope="col">Phone number</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(number, index) in trackingNumbers" :key="index">
              <td>{{ display(number.phone_number) }}</td>
              <td>{{ display(number.source) }}</td>
            </tr>
          </tbody>
        </v-table>
        <p v-else>No tracking numbers have been recorded for this location.</p>
      </v-expansion-panel-text>
    </v-expansion-panel>
    <v-expansion-panel title="Activity history">
      <v-expansion-panel-text>
        <article v-for="(event, index) in history" :key="index" class="py-3">
          <h3 class="text-subtitle-1 font-weight-bold">{{ event.actor }}</h3>
          <p v-if="event.time" class="text-caption">{{ event.time }}</p>
          <p v-if="event.comment" class="my-2">{{ event.comment }}</p>
          <v-table
            v-if="event.fields.length"
            density="compact"
            class="activity-table"
          >
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Before</th>
                <th scope="col">After</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="field in event.fields" :key="field.key">
                <th scope="row">{{ field.label }}</th>
                <td>{{ field.previous }}</td>
                <td>
                  <strong v-if="field.changed">{{
                    field.next
                  }}</strong><template v-else>{{ field.next }}</template>
                </td>
              </tr>
            </tbody>
          </v-table>
        </article>
        <p v-if="!history.length">
          No activity has been recorded for this location.
        </p>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<style scoped>
.activity-table {
  overflow-wrap: anywhere;
}
</style>
