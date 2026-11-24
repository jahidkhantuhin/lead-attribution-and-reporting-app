<template>
  <div class="payment-report-detail">
    <h3>Payment by client</h3>

    <v-data-table
      item-key="name"
      :headers="headers"
      :items="report"
      :items-per-page="5"
      :disable-pagination="true"
      :disable-filtering="true"
      :hide-default-footer="true"
      :disable-sort="true"
      class="payment-table"
    >
      <template #item.total_call_duration="{ item }">
        <formatted-duration :value="item.total_call_duration" />
      </template>
      <template #item.total_rating_time="{ item }">
        <formatted-duration :value="item.total_rating_time" />
      </template>
    </v-data-table>
  </div>
</template>
<script>
import { defineComponent } from '@vue/composition-api'
import { PaymentReportColumns } from '~/utils/reports-upload/payment-report'

export default defineComponent({
  props: {
    report: { type: Array, default: undefined },
  },
  setup(_props) {
    return {
      headers: PaymentReportColumns(),
    }
  },
})
</script>

<style>
.payment-report-detail {
  min-width: 0;
  padding: 0 clamp(16px, 2.5vw, 24px) 24px;
}

.payment-report-detail h3 {
  margin-bottom: 12px;
  font-size: 1rem;
}

.payment-table {
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
  font-variant-numeric: tabular-nums;
}

.payment-report-detail .payment-table tbody tr:last-child td {
  background: var(--workspace-tint);
  color: var(--workspace-ink);
  font-weight: 700;
}
</style>
