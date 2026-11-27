<script setup lang="ts">
import { getReportRange } from '~/services/report-period'
import { reportDate } from '~/services/report-filters'

const props = defineProps<{ presets?: readonly string[] }>()
const dates = defineModel<string[]>({ required: true })
const start = computed({
  get: () => dates.value[0] || '',
  set: (value: string) => {
    dates.value = value ? [value, dates.value[1] || ''] : []
  },
})
const end = computed({
  get: () => dates.value[1] || '',
  set: (value: string) => {
    if (start.value) dates.value = [start.value, value]
  },
})

function apply(preset: string) {
  const now = new Date()
  if (preset === 'All available dates') {
    dates.value = []
    return
  }
  if (preset === 'Last 14 days') {
    const first = new Date(now)
    first.setDate(first.getDate() - 14)
    now.setDate(now.getDate() - 1)
    dates.value = [reportDate(first), reportDate(now)]
    return
  }
  const yearOffsets: Record<string, number> = {
    'This year': 0,
    'Last year': 1,
    'Last 2 years': 2,
    'Last 5 years': 5,
  }
  const offset = yearOffsets[preset]
  if (offset !== undefined) {
    const year = now.getFullYear() - offset
    const first = new Date(year, 0, 1)
    dates.value = [
      reportDate(first),
      reportDate(preset === 'Last year' ? new Date(year, 11, 31) : now),
    ]
    return
  }
  const period =
    preset === 'This week'
      ? 'this_week'
      : preset === 'Last week'
        ? 'last_week'
        : 'last_month'
  const range = getReportRange(period, now)
  dates.value = [range.date_start, range.date_end]
}
</script>

<template>
  <div class="report-date-range">
    <v-text-field
      v-model="start"
      type="date"
      label="Start date"
      density="compact"
      variant="outlined"
      hide-details
    />
    <v-text-field
      v-model="end"
      type="date"
      label="End date"
      :min="start || undefined"
      :disabled="!start"
      density="compact"
      variant="outlined"
      hide-details
    />
    <v-menu v-if="props.presets?.length">
      <template #activator="{ props: activator }">
        <v-btn
          v-bind="activator"
          icon="mdi-calendar-range"
          aria-label="Date presets"
          variant="text"
        />
      </template>
      <v-list density="compact">
        <v-list-item
          v-for="preset in props.presets"
          :key="preset"
          :title="preset"
          @click="apply(preset)"
        />
      </v-list>
    </v-menu>
  </div>
</template>

<style scoped>
.report-date-range {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.report-date-range > .v-input {
  min-width: 130px;
}
</style>
