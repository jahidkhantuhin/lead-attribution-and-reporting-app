import moment from 'moment-timezone'
import defaultTimezone from './defaultTimezone'

export const fullDateWithTime = 'dddd, MMMM D, YYYY · h:mm A z'
export const fullDateWithoutTime = 'dddd, MMMM D, YYYY'
export const shortenedDate = 'MMM D, YYYY'
export const onlyDay = 'ddd'

const calendarDate = /^\d{4}-\d{2}-\d{2}$/
const explicitOffset = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i

export function readDisplayDate(value, timezone = defaultTimezone) {
  if (value == null || value === '') return null
  const text = typeof value === 'string' ? value.trim() : value
  const dateOnly = typeof text === 'string' && calendarDate.test(text)
  const zone =
    typeof timezone === 'string' && moment.tz.zone(timezone)
      ? timezone
      : defaultTimezone

  let date
  if (dateOnly) {
    date = moment.utc(text, 'YYYY-MM-DD', true)
  } else if (typeof text === 'number') {
    date = moment.utc(text)
    if (timezone !== false) date.tz(zone)
  } else if (typeof text === 'string' && explicitOffset.test(text)) {
    date = moment.parseZone(text, moment.ISO_8601, true)
    if (timezone !== false) date.tz(zone)
  } else {
    // The API also supplies Eastern wall-clock times without an offset.
    date =
      timezone === false
        ? moment.utc(text, moment.ISO_8601, true)
        : moment.tz(text, moment.ISO_8601, true, zone)
  }
  return date.isValid() ? { date, dateOnly } : null
}

export function formatDateRange(start, end = start) {
  const firstDay = readDisplayDate(start, false)?.date.format('YYYY-MM-DD')
  const lastDay = readDisplayDate(end, false)?.date.format('YYYY-MM-DD')
  if (!firstDay || !lastDay) return null
  const first = moment.utc(firstDay, 'YYYY-MM-DD', true)
  const last = moment.utc(lastDay, 'YYYY-MM-DD', true)
  if (last.isBefore(first, 'day')) return null

  const days =
    last.clone().startOf('day').diff(first.clone().startOf('day'), 'days') + 1
  const sameYear = first.year() === last.year()
  const sameMonth = sameYear && first.month() === last.month()
  return {
    first: first.format('YYYY-MM-DD'),
    last: last.format('YYYY-MM-DD'),
    startLabel: first.format(days === 1 || !sameYear ? shortenedDate : 'MMM D'),
    endLabel:
      days === 1 ? '' : last.format(sameMonth ? 'D, YYYY' : shortenedDate),
    days,
  }
}

export function formatMonthLabel(value) {
  const month = moment.utc(value, 'YYYY-MM', true)
  return month.isValid() ? month.format('MMM YYYY') : value
}

export function formatDuration(value) {
  if (value == null || value === '') return '—'
  const seconds =
    typeof value === 'string' && /^\d+(?::\d{2}){1,2}$/.test(value)
      ? value.split(':').reduce((total, unit) => total * 60 + Number(unit), 0)
      : Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return '—'

  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total / 60) % 60
  const remainder = total % 60
  if (hours) return [hours + 'h', minutes + 'm', remainder + 's'].join(' ')
  return minutes
    ? minutes + 'm ' + String(remainder).padStart(2, '0') + 's'
    : remainder + 's'
}
