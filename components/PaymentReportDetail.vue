<template>
  <div class="payment-report-detail">
    <v-card-title> Showing reports for {{ scorer }} </v-card-title>
    <v-card-text>
      <v-data-table
        id="table"
        :headers="headers"
        :items="report"
        :items-per-page="5"
        :disable-pagination="true"
        :disable-filtering="true"
        :no-data-text="`No Reports found for ${scorer}`"
        :hide-default-footer="true"
        :disable-sort="true"
        class="elevation-1 mb-3"
      >
        <template #item.total_call_duration="{ item }">
          <formatted-duration :value="item.total_call_duration" />
        </template>
        <template #item.total_rating_time="{ item }">
          <formatted-duration :value="item.total_rating_time" />
        </template>
      </v-data-table>
    </v-card-text>
  </div>
</template>
<script>
import { defineComponent } from '@vue/composition-api'
import { PaymentReportColumns } from '~/utils/reports-upload/payment-report'

export default defineComponent({
  props: {
    scorer: { type: [String, Number], default: undefined },
    report: { type: Array, default: undefined },
    payRate: { type: [Number, String], default: undefined },
  },
  setup(_props) {
    return {
      headers: PaymentReportColumns(),
    }
  },
})
</script>

<style lang="scss">
.payment-report-detail {
  margin-top: -10px;
  .v-data-footer {
    display: none;
  }
  table {
    tbody {
      tr {
        &:last-child {
          td {
            font-weight: bold;
          }
        }
      }
    }
  }
}
</style>
