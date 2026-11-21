<template>
  <time v-if="display" class="workspace-date" :datetime="display.datetime" :title="display.title">
    <span>{{ display.label }}</span>
    <span v-if="display.clock" class="workspace-date-clock">
      {{ display.clock }}
      <span v-if="display.zone" class="workspace-date-zone">{{ display.zone }}</span>
    </span>
  </time>
  <span v-else class="workspace-date-empty" aria-label="Date unavailable">—</span>
</template>

<script>
import { computed, defineComponent } from '@vue/composition-api'
import defaultTimezone from '~/utils/defaultTimezone'
import { readDisplayDate, Shortened_Date, Full_Date_With_Time } from '~/utils/dateFormat'

export default defineComponent({
  props: {
    date: [String, Number],
    dateOnly: Boolean,
    timezone: { type: [String, Boolean], default: defaultTimezone },
    formatString: { type: String, default: '' },
  },
  setup(props) {
    const display = computed(() => {
      const parsed = readDisplayDate(props.date, props.dateOnly ? false : props.timezone)
      if (!parsed) return null
      const { date } = parsed
      const calendarOnly = parsed.dateOnly || props.dateOnly
      return {
        label: date.format(props.formatString || Shortened_Date),
        clock: calendarOnly || props.formatString ? '' : date.format('h:mm A'),
        zone: props.timezone === false ? '' : date.format('z'),
        datetime: calendarOnly ? date.format('YYYY-MM-DD') : date.toISOString(),
        title: date.format(calendarOnly ? Shortened_Date : Full_Date_With_Time).trim(),
      }
    })
    return { display }
  },
})
</script>
