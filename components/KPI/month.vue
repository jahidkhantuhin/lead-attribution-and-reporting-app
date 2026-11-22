<template>
  <div v-if="response">
    <!-- <pre>{{ JSON.stringify(summaryTransformed, null, 2) }}</pre> -->

    <div
      v-for="(year, index) in Object.keys(summaryTransformed)"
      :key="index"
      class=""
    >
      <h1 class="heading">{{ year }}</h1>
      <KPITable mode="month" :rows="summaryTransformed[year]"></KPITable>
    </div>
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
.heading {
  font-size: 30px;
  margin: 50px 0;
}
</style>
