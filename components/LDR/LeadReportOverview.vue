<template>
  <section class="lead-overview" aria-label="Lead summary">
    <dl class="lead-metrics">
      <div v-for="metric in metrics" :key="metric.label" class="lead-metric">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>

    <div class="lead-overview-grid">
      <section class="lead-report-card">
        <h2>Lead mix</h2>
        <div v-if="total" class="lead-mix-bar" aria-hidden="true">
          <span
            v-for="channel in channels"
            :key="channel.label"
            :class="channel.tone"
            :style="{ flexGrow: channel.total }"
          />
        </div>
        <table class="lead-summary-table">
          <thead>
            <tr>
              <th scope="col">Lead type</th>
              <th scope="col">Total</th>
              <th scope="col">Unique</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="channel in channels" :key="channel.label">
              <th scope="row">
                <span class="lead-key" :class="channel.tone" />{{
                  channel.label
                }}
              </th>
              <td>{{ formatNumber(channel.total) }}</td>
              <td>{{ formatNumber(channel.unique) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="lead-report-card">
        <h2>Paid channel performance</h2>
        <table class="lead-summary-table lead-performance-table">
          <thead>
            <tr>
              <th scope="col">Channel</th>
              <th scope="col">Impressions</th>
              <th scope="col">Clicks</th>
              <th scope="col">Conversions</th>
              <th scope="col">Spend</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paidPerformance" :key="row.label">
              <th scope="row">{{ row.label }}</th>
              <td data-label="Impressions">
                {{ formatNumber(row.data.impressions) }}
              </td>
              <td data-label="Clicks">{{ formatNumber(row.data.clicks) }}</td>
              <td data-label="Conversions">
                {{ formatNumber(row.data.conversions) }}
              </td>
              <td data-label="Spend">
                {{ formatMoney(row.data.total_spend) }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </section>
</template>

<script lang="ts">
import { computed, defineComponent } from '@nuxtjs/composition-api'

const number = new Intl.NumberFormat('en-US')
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})
const count = (value: unknown) => Number(value) || 0

export default defineComponent({
  props: {
    summary: { type: Object, required: true },
    analytics: { type: Object, required: true },
  },
  setup(props) {
    const channels = computed(() => [
      { label: 'Calls', tone: 'lead-tone-blue', ...props.summary.calls },
      { label: 'Chats', tone: 'lead-tone-teal', ...props.summary.chats },
      { label: 'Web forms', tone: 'lead-tone-violet', ...props.summary.emails },
      {
        label: 'Facebook forms',
        tone: 'lead-tone-amber',
        ...props.summary.facebook_leads,
      },
    ])
    const total = computed(() =>
      channels.value.reduce((sum, channel) => sum + count(channel.total), 0)
    )
    const unique = computed(() =>
      channels.value.reduce((sum, channel) => sum + count(channel.unique), 0)
    )
    const formatNumber = (value: unknown) => number.format(count(value))
    const formatMoney = (value: unknown) => money.format(count(value))
    const metrics = computed(() => {
      const spend = count(props.analytics.aggregate?.total_spend)
      return [
        { label: 'Total leads', value: formatNumber(total.value) },
        { label: 'Unique leads', value: formatNumber(unique.value) },
        { label: 'Paid spend', value: formatMoney(spend) },
        {
          label: 'Cost per unique lead',
          value: unique.value ? formatMoney(spend / unique.value) : '—',
        },
      ]
    })
    const paidPerformance = computed(() => [
      { label: 'Google Ads', data: props.analytics.adwords || {} },
      { label: 'Facebook', data: props.analytics.facebook || {} },
      { label: 'Combined', data: props.analytics.aggregate || {} },
    ])
    return {
      channels,
      formatMoney,
      formatNumber,
      metrics,
      paidPerformance,
      total,
    }
  },
})
</script>
