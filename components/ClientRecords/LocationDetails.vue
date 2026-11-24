<template>
  <div class="workspace-record-stack">
    <div v-if="loading" role="status" aria-label="Loading details">
      <v-expand-transition>
        <v-card>
          <v-card-text>
            <v-skeleton-loader
              type="table-heading, table-row-divider, table-row-divider"
            ></v-skeleton-loader>
          </v-card-text>
        </v-card>
      </v-expand-transition>
    </div>
    <div v-else class="workspace-record-content">
      <v-card flat>
        <ReportResultHeading :title="locationData.name || 'Location details'">
          <workspace-badge
            v-if="locationData.status"
            :value="locationData.status"
          />
          <template v-if="locationData.client" #actions>
            <v-btn
              small
              outlined
              :to="`/client-records/${locationData.client.id}`"
              >Client record</v-btn
            >
            <v-btn
              small
              depressed
              color="primary"
              :to="`/client-records/${locationData.client.id}/locations/${locationData.id}/edit`"
            >
              <v-icon small left>mdi-pencil-outline</v-icon> Edit location
            </v-btn>
          </template>
        </ReportResultHeading>
        <RecordFacts
          :fields="[
            { label: 'Address', value: locationData.address },
            { label: 'City', value: locationData.city },
            { label: 'State', value: locationData.state },
            { label: 'ZIP code', value: locationData.zipcode },
            { label: 'Website', value: locationData.website },
            { label: 'Reporting email', value: locationData.reporting_mail },
            { label: 'Google Ads budget', value: locationData.adwords_budget },
            { label: 'Facebook budget', value: locationData.facebook_budget },
            { label: 'Monthly fee', value: locationData.monthly_fee },
            { label: 'Apex Chat ID', value: locationData.apexchat_id },
            { label: 'Facebook ID', value: locationData.facebook_id },
            { label: 'Google Ads ID', value: locationData.adwords_id },
            {
              label: 'Last updated',
              value: locationData.updated_at,
              kind: 'date',
            },
          ]"
        >
          <template #date="{ field }">
            <formatted-date :date="field.value" />
          </template>
        </RecordFacts>
      </v-card>
      <v-expansion-panels v-model="panel" class="workspace-detail-panels">
        <v-expansion-panel :key="1">
          <v-expansion-panel-header>
            <h2>Activity history</h2>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <article
              v-for="(item, index) in locationData.location_activity_logs"
              :key="item.id || index"
              class="record-activity"
            >
              <header class="record-activity-heading">
                <div>
                  <h3>
                    {{
                      item.user
                        ? [item.user.first_name, item.user.last_name]
                            .filter(Boolean)
                            .join(' ')
                        : 'Location updated'
                    }}
                  </h3>
                  <p v-if="item.user && item.user.email">
                    {{ item.user.email }}
                  </p>
                  <formatted-date
                    v-if="item.new_data && item.new_data.updated_at"
                    :date="item.new_data.updated_at"
                  />
                </div>
                <truncate-text
                  v-if="item.comment"
                  :quotes="true"
                  title="Comment"
                  :button="true"
                  show-text="View comment"
                  :text="item.comment"
                />
              </header>
              <v-simple-table dense class="workspace-detail-table">
                <thead>
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">Before</th>
                    <th scope="col">After</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="field in activityChanges(item)" :key="field.key">
                    <th scope="row">{{ field.label }}</th>
                    <td>{{ field.before }}</td>
                    <td :class="{ 'record-activity-changed': field.changed }">
                      {{ field.after }}
                    </td>
                  </tr>
                </tbody>
              </v-simple-table>
            </article>
            <p
              v-if="
                !locationData.location_activity_logs ||
                !locationData.location_activity_logs.length
              "
            >
              No activity has been recorded for this location.
            </p>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@nuxtjs/composition-api'

import FormattedDate from '~/components/FormattedDate.vue'

const activityFields = [
  { key: 'name', label: 'Name' },
  { key: 'client_status', label: 'Status' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zipcode', label: 'ZIP code' },
  { key: 'website', label: 'Website' },
  { key: 'reporting_mail', label: 'Reporting email' },
  { key: 'adwords_budget', label: 'Google Ads budget' },
  { key: 'facebook_budget', label: 'Facebook budget' },
  { key: 'monthly_fee', label: 'Monthly fee' },
  { key: 'apexchat_id', label: 'Apex Chat ID' },
  { key: 'facebook_id', label: 'Facebook ID' },
  { key: 'adwords_id', label: 'Google Ads ID' },
]

type ActivityData = Record<string, unknown>

const displayActivityValue = (value: unknown) =>
  value == null || value === '' ? '—' : String(value)

const activityChanges = (
  entry: Partial<Record<'old_data' | 'new_data', ActivityData>>
) => {
  const before = entry.old_data || {}
  const after = entry.new_data || {}

  return activityFields
    .filter(({ key }) => key in before || key in after)
    .map((field) => {
      const previous = displayActivityValue(before[field.key])
      const next =
        field.key in after ? displayActivityValue(after[field.key]) : previous
      return {
        ...field,
        before: previous,
        after: next,
        changed: previous !== next,
      }
    })
}

export default defineComponent({
  components: {
    FormattedDate,
  },
  props: {
    locationData: {
      type: Object,
      default: () => ({}),
    },
    loading: { type: Boolean, default: false },
  },
  setup() {
    const panel = ref()

    return {
      panel,
      activityChanges,
    }
  },
})
</script>
