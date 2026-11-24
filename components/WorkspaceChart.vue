<template>
  <div class="workspace-chart" :aria-label="label" role="group">
    <apexchart
      width="100%"
      :height="chartHeight"
      :type="type"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@nuxtjs/composition-api'
import VueApexCharts from 'vue-apexcharts'
import type { Framework } from 'vuetify/types'

export default defineComponent({
  components: { apexchart: VueApexCharts },
  props: {
    label: { type: String, required: true },
    type: { type: String, required: true },
    options: { type: Object, required: true },
    series: { type: Array, required: true },
    height: { type: Number, default: 330 },
  },
  setup(props, { root }) {
    const { $vuetify } = root as typeof root & { $vuetify: Framework }
    const chartHeight = computed(() =>
      $vuetify.breakpoint.xs ? Math.min(320, props.height) : props.height
    )
    const chartOptions = computed(() => {
      const dark = $vuetify.theme.dark
      const options = props.options
      return {
        ...options,
        theme: { mode: dark ? 'dark' : 'light' },
        chart: {
          background: 'transparent',
          foreColor: dark ? '#bac7dc' : '#52627a',
          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
          parentHeightOffset: 0,
          animations: { enabled: false },
          toolbar: { show: false },
          ...options.chart,
        },
        grid: {
          borderColor: dark ? '#364662' : '#dce4f0',
          strokeDashArray: 3,
          ...options.grid,
        },
        legend: {
          position: 'top',
          horizontalAlign: 'left',
          fontSize: '12px',
          itemMargin: { horizontal: 8, vertical: 4 },
          ...options.legend,
        },
        dataLabels: { enabled: false },
        tooltip: { shared: true, intersect: false },
        noData: { text: 'No data for this period' },
        yaxis: { min: 0, decimalsInFloat: 0, forceNiceScale: true },
        xaxis: {
          axisBorder: { show: false },
          axisTicks: { show: false },
          ...options.xaxis,
        },
      }
    })

    return { chartHeight, chartOptions }
  },
})
</script>

<style scoped>
.workspace-chart {
  min-width: 0;
}
</style>
