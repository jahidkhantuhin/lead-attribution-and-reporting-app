import moment from 'moment'
import type { DetailKey, LeadRecord } from './lead-attribution'
import columns from './lead-attribution-columns.json'

interface LeadColumn {
  text: string
  value: string
  width?: string
  sortable?: boolean
  displayInExcel?: boolean
  styles: Record<string, string | undefined>
  format?: string
}

export type LeadSection = DetailKey | 'all'
export const leadColumns = (section: LeadSection): LeadColumn[] =>
  columns[section]

export function tableLeadRecord(row: LeadRecord, section: LeadSection) {
  const scorer = row.score?.scorer
  return {
    ...row,
    ...(section === 'adwords_calls'
      ? {
          cs_name: scorer?.first_name
            ? scorer.first_name.charAt(0) + ', ' + (scorer.last_name ?? '')
            : 'No scorer',
        }
      : {}),
    ...(section.includes('call') && Number.isFinite(row.call_duration)
      ? {
          call_duration: new Date(Number(row.call_duration) * 1000)
            .toISOString()
            .slice(11, 19),
        }
      : {}),
  }
}

function readLeadField(record: object, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value !== null && typeof value === 'object' && Object.hasOwn(value, key)
          ? (value as Record<string, unknown>)[key]
          : undefined,
      record,
    )
}

export function recordingLink(value: string | undefined, player: string) {
  if (!player || !value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && url.hostname === 'drive.google.com')
      return value
  } catch {
    // Recording identifiers may be relative paths understood by the player.
  }
  return player + '?url=' + value
}

export function workbookCell(
  column: LeadColumn,
  record: object,
  player: string,
) {
  const [format, path] = column.format?.split(':') ?? []
  const value = readLeadField(record, path ?? column.value)
  switch (format) {
    case 'audio':
      return recordingLink(
        typeof value === 'string' ? value : undefined,
        player,
      )
    case 'datetime':
      return moment(
        typeof value === 'string' || typeof value === 'number' ? value : NaN,
      ).format('dddd, MMMM DD, YYYY @ hh:mm:ss A z')
    case 'weekday':
      return moment(String(readLeadField(record, 'call_start') ?? '')).format(
        'dddd',
      )
    case 'shortWeekday':
      return moment(String(readLeadField(record, 'call_start') ?? '')).format(
        'ddd',
      )
    case 'phone':
      return typeof value === 'string'
        ? value.trim().replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
        : ''
    case 'capitalize':
      return typeof value === 'string'
        ? value.charAt(0).toUpperCase() + value.slice(1)
        : ''
    default:
      return value
  }
}

const weekendShade = (date?: string) =>
  date && [0, 6].includes(moment(date).day()) ? '#EEEEEE' : ''
export function leadRowShade(row: LeadRecord, section: LeadSection) {
  if (!section.includes('call'))
    return weekendShade(section.includes('chat') ? row.chat_date : row.date)
  const booked = row.score?.booked_appointment ?? ''
  const status = row.score?.call_status ?? booked
  if (
    ['live_answer_booked', 'live_answer_lead_booked'].includes(status) ||
    (status === 'live_answer' && booked.includes('yes'))
  )
    return '#B9F6CA'
  if (
    ['live_answer_not_booked', 'live_answer_lead_not_booked'].includes(
      status,
    ) ||
    (status === 'live_answer' && booked.includes('no'))
  )
    return '#FF8A80'
  if (status === 'voice_mail_require_appointment') return '#FFD180'
  if (
    [
      'voice_mail',
      'no_answer_hangup',
      'voice_mail_not_require_appointment',
      'message_left_no_lead',
      'message_left_lead',
      'voiceMail_no_lead',
    ].includes(status)
  )
    return '#FFFF8D'
  if (
    [
      'live_answer',
      'technical_issues',
      'technical_issue_spam_robocall_hangup',
      'confirmed_appointment',
      'wrong_number',
      'cancel',
      'reschedule',
      'info_request',
      'reschedule_cancel_confirm',
      'vendor',
      'others',
    ].includes(status)
  )
    return '#82B1FF'
  return weekendShade(row.call_start)
}
