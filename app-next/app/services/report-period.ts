export type ReportPeriod =
  'this_week' | 'last_week' | 'this_month' | 'last_month'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function dateKey(date: Date) {
  const parts = dateFormatter.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value
  return [read('year'), read('month'), read('day')].join('-')
}

export function getReportRange(period: ReportPeriod, now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()
  if (period === 'this_month' || period === 'last_month') {
    const offset = period === 'last_month' ? -1 : 0
    return {
      date_start: dateKey(new Date(year, month + offset, 1)),
      date_end: dateKey(new Date(year, month + offset + 1, 0)),
    }
  }
  const monday =
    day - ((now.getDay() + 6) % 7) - (period === 'last_week' ? 7 : 0)
  return {
    date_start: dateKey(new Date(year, month, monday)),
    date_end: dateKey(new Date(year, month, monday + 6)),
  }
}

export function formatReportRange(start: string, end: string) {
  const first = new Date(start + 'T00:00:00Z')
  const last = new Date(end + 'T00:00:00Z')
  const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(
      date,
    )
  const full = { month: 'short', day: 'numeric', year: 'numeric' } as const
  if (start === end) return format(first, full)
  const sameYear = first.getUTCFullYear() === last.getUTCFullYear()
  const sameMonth = sameYear && first.getUTCMonth() === last.getUTCMonth()
  const startLabel = format(
    first,
    sameYear ? { month: 'short', day: 'numeric' } : full,
  )
  return (
    startLabel +
    '–' +
    (sameMonth
      ? last.getUTCDate() + ', ' + last.getUTCFullYear()
      : format(last, full))
  )
}
