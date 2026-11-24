<template>
  <div v-if="response" class="kpi-year-list">
    <section
      v-for="(rows, year) in summaryTransformed"
      :key="year"
      class="kpi-year-section"
      :aria-label="`Monthly KPIs for ${year}`"
    >
      <h3>{{ year }}</h3>
      <KPITable mode="month" :rows="rows" />
    </section>
    <p v-if="!Object.keys(summaryTransformed).length" class="kpi-year-empty">
      No KPI results for this period.
    </p>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@nuxtjs/composition-api'
import KPITable from '~/components/KPI/table.vue'

import { transformMonthlyReportIntoObject } from '~/utils/reports-upload/kpi'

export default defineComponent({
  components: {
    KPITable,
  },
  props: {
    response: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const summaryTransformed = computed(() => {
      return transformMonthlyReportIntoObject(props.response.summary)
    })
    return {
      summaryTransformed,
    }
  },
})
</script>

<style scoped>
.kpi-year-list {
  display: grid;
  min-width: 0;
  gap: 12px;
  padding: 12px;
}

.kpi-year-section {
  min-width: 0;
}

.kpi-year-section h3 {
  display: inline-block;
  margin-bottom: 8px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--workspace-tint);
  color: var(--workspace-ink);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.kpi-year-empty {
  margin: 0;
  color: var(--workspace-muted);
}
</style>
