<template>
  <section class="lead-sources" aria-label="Summary by source">
    <article
      v-for="source in sources"
      :key="source.name"
      class="lead-report-card lead-source-card"
    >
      <header class="lead-source-heading">
        <span class="lead-source-icon" :class="source.tone"
          ><v-icon small>{{ source.icon }}</v-icon></span
        >
        <div>
          <h2>{{ source.name }}</h2>
          <p>{{ source.type }}</p>
        </div>
      </header>
      <dl class="lead-source-metrics">
        <div>
          <dt>{{ source.paid ? 'Total leads' : 'Lead records' }}</dt>
          <dd>{{ formatNumber(source.total) }}</dd>
        </div>
        <div v-if="source.paid">
          <dt>Unique leads</dt>
          <dd>{{ formatNumber(source.unique) }}</dd>
        </div>
        <div v-if="source.paid">
          <dt>Spend</dt>
          <dd>{{ formatMoney(source.spend) }}</dd>
        </div>
        <div v-if="source.paid">
          <dt>Cost per unique lead</dt>
          <dd>
            {{
              source.unique ? formatMoney(source.spend / source.unique) : '—'
            }}
          </dd>
        </div>
      </dl>

      <h3>Lead breakdown</h3>
      <table class="lead-summary-table">
        <thead>
          <tr>
            <th scope="col">Lead type</th>
            <th scope="col">Total</th>
            <th v-if="source.paid" scope="col">Unique</th>
            <th v-if="source.paid" scope="col">Share of unique</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in source.rows" :key="row.label">
            <th scope="row">{{ row.label }}</th>
            <td>{{ formatNumber(row.total) }}</td>
            <td v-if="source.paid">{{ formatNumber(row.unique) }}</td>
            <td v-if="source.paid">
              {{
                source.unique ? formatShare(row.unique / source.unique) : '—'
              }}
            </td>
          </tr>
        </tbody>
      </table>

      <template v-if="source.paid">
        <h3 class="lead-outcomes-heading">Call outcomes</h3>
        <dl class="lead-outcomes">
          <div
            v-for="outcome in source.outcomes"
            :key="outcome.label"
            class="lead-outcome"
            :class="outcome.value ? outcome.tone : 'lead-outcome--empty'"
          >
            <dt>
              <v-icon small aria-hidden="true">{{ outcome.icon }}</v-icon>
              <span>{{ outcome.label }}</span>
            </dt>
            <dd>{{ formatNumber(outcome.value) }}</dd>
          </div>
        </dl>
      </template>
      <p v-else class="lead-source-note">
        Organic results show recorded activity. Unique counts and spend are
        unavailable for this source.
      </p>
    </article>
  </section>
</template>

<script lang="ts">
import { computed, defineComponent } from '@nuxtjs/composition-api'

const count = (value: unknown) => Number(value) || 0
const number = new Intl.NumberFormat('en-US')
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})
const leadTypes = [
  { key: 'calls', label: 'Calls' },
  { key: 'chats', label: 'Chats' },
  { key: 'forms', label: 'Forms' },
]
const callTypes = [
  {
    key: 'booked',
    label: 'Booked',
    icon: 'mdi-check-circle-outline',
    tone: 'lead-outcome--positive',
  },
  {
    key: 'not_booked',
    label: 'Not booked',
    icon: 'mdi-minus-circle-outline',
    tone: 'lead-outcome--caution',
  },
  {
    key: 'missed',
    label: 'Missed',
    icon: 'mdi-phone-missed',
    tone: 'lead-outcome--negative',
  },
  { key: 'irrelevant', label: 'Irrelevant', icon: 'mdi-filter-remove-outline' },
  { key: 'unscored', label: 'Unscored', icon: 'mdi-clock-outline' },
]

export default defineComponent({
  props: { report: { type: Object, required: true } },
  setup(props) {
    const sources = computed(() => {
      const details = props.report.details || {}
      const analytics = props.report.lead_analytics || {}
      const paid = [
        {
          key: 'adwords',
          name: 'Google Ads',
          type: 'Paid search',
          icon: 'mdi-magnify',
          tone: 'lead-tone-blue',
        },
        {
          key: 'facebook',
          name: 'Facebook',
          type: 'Paid social',
          icon: 'mdi-facebook',
          tone: 'lead-tone-violet',
        },
      ].map((source) => {
        const data = details.am?.[source.key] || {}
        const rows = leadTypes.map(({ key, label }) => ({
          label,
          total: count(data[key]?.total),
          unique: count(data[key]?.unique),
        }))
        return {
          ...source,
          paid: true,
          rows,
          total: rows.reduce((sum, row) => sum + row.total, 0),
          unique: rows.reduce((sum, row) => sum + row.unique, 0),
          spend: count(analytics[source.key]?.total_spend),
          outcomes: callTypes.map(({ key, ...appearance }) => ({
            ...appearance,
            value: count(data.call_summary?.[key]),
          })),
        }
      })
      const organicRows = [
        { key: 'seo_calls', label: 'Calls' },
        { key: 'seo_chats', label: 'Chats' },
        { key: 'seo_emails', label: 'Forms' },
      ].map(({ key, label }) => ({
        label,
        unique: 0,
        total: Array.isArray(details[key]) ? details[key].length : 0,
      }))
      return [
        ...paid,
        {
          name: 'Organic search',
          type: 'SEO',
          icon: 'mdi-chart-line',
          tone: 'lead-tone-teal',
          paid: false,
          rows: organicRows,
          total: organicRows.reduce((sum, row) => sum + row.total, 0),
          unique: 0,
          spend: 0,
          outcomes: [],
        },
      ]
    })
    return {
      sources,
      formatNumber: (value: number) => number.format(value),
      formatMoney: (value: number) => money.format(value),
      formatShare: (value: number) => percent.format(value),
    }
  },
})
</script>
