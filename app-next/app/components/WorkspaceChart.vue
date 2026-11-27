<script setup lang="ts">
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { useDisplay, useTheme } from 'vuetify'

const props = withDefaults(
  defineProps<{
    label: string
    type: NonNullable<NonNullable<ApexOptions['chart']>['type']>
    options: ApexOptions
    series: NonNullable<ApexOptions['series']>
    height?: number
  }>(),
  { height: 330 },
)

const { xs } = useDisplay()
const theme = useTheme()
const chartHeight = computed(() =>
  xs.value ? Math.min(320, props.height) : props.height,
)
const chartOptions = computed<ApexOptions>(() => {
  const dark = theme.global.current.value.dark
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
</script>

<template>
  <div class="workspace-chart" :aria-label="label" role="group">
    <ClientOnly>
      <VueApexCharts
        width="100%"
        :height="chartHeight"
        :type="type"
        :options="chartOptions"
        :series="series"
      />
    </ClientOnly>
  </div>
</template>
