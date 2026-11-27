import type { RecordId } from '~/types/api'

export const summaryKeys = [
  'calls',
  'chats',
  'emails',
  'facebook_leads',
] as const
export const detailKeys = [
  'calls',
  'adwords_calls',
  'facebook_calls',
  'seo_calls',
  'chats',
  'adwords_chats',
  'facebook_chats',
  'seo_chats',
  'emails',
  'facebook_leads',
  'seo_emails',
] as const
export type DetailKey = (typeof detailKeys)[number]
type Count = { total: number; unique: number }
type AnalyticsKey = 'adwords' | 'facebook' | 'aggregate'
type PaidSource = Exclude<AnalyticsKey, 'aggregate'>
type OutcomeKey = 'booked' | 'not_booked' | 'missed' | 'irrelevant' | 'unscored'

export interface Analytics {
  total_spend: number
  impressions: number
  clicks: number
  conversions: number
  cpl?: number
  total_unique_leads?: number
  account_shared?: boolean
}

interface SourceDetails extends Partial<Analytics> {
  calls?: Count
  chats?: Count
  forms?: Count
  call_summary?: Partial<Record<OutcomeKey, number>>
}

export interface LeadRecord {
  id?: RecordId
  lead?: {
    name?: string
    email?: string
    phone?: string
    phone_number?: string
    procedure?: string
    lead_source?: string
    message?: string
  }
  score?: {
    call_status?: string
    booked_appointment?: string
    procedure?: { name: string }
    comment?: string
    scorer?: { first_name?: string; last_name?: string }
  }
  campaign?: { name?: string; timezone?: string }
  other_details?: { lead_source?: string }
  caller_name?: string
  caller_number?: string
  date?: string
  chat_date?: string
  call_start?: string
  call_duration?: number
  call_url?: string
  chat?: string
  location_name?: string
  procedure?: string
}
interface LocationLeadData {
  date_start: string
  date_end: string
  location: { id: RecordId; name: string }
  summary: Record<(typeof summaryKeys)[number], Count>
  lead_analytics: Record<AnalyticsKey, Analytics>
  details: Partial<Record<DetailKey, LeadRecord[]>> & {
    am?: Partial<Record<PaidSource, SourceDetails>>
  }
}

export interface LeadReport {
  id: RecordId
  name: string
  cache?: { created_at?: string; cache?: { created_at?: string } }
  locations: LocationLeadData[]
}

const blankCount = () => ({ total: 0, unique: 0 })
const blankAnalytics = (): Analytics => ({
  total_spend: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
})
const blankSource = () => ({
  calls: blankCount(),
  chats: blankCount(),
  forms: blankCount(),
  clicks: 0,
  impressions: 0,
  cpl: 0,
  call_summary: {
    booked: 0,
    not_booked: 0,
    missed: 0,
    irrelevant: 0,
    unscored: 0,
  },
})
const outcomeKeys = [
  'booked',
  'not_booked',
  'missed',
  'irrelevant',
  'unscored',
] as const
const channels = ['adwords', 'facebook', 'aggregate'] as const
const paid = ['adwords', 'facebook'] as const
const number = (value: unknown) => Number(value) || 0
function addCount(target: Count, source?: Count) {
  target.total += number(source?.total)
  target.unique += number(source?.unique)
}

export function buildLeadReport(leadReport: LeadReport) {
  const summary = {
    calls: blankCount(),
    chats: blankCount(),
    emails: blankCount(),
    facebook_leads: blankCount(),
  }
  const analytics = {
    adwords: blankAnalytics(),
    facebook: blankAnalytics(),
    aggregate: blankAnalytics(),
  }
  const sources = { adwords: blankSource(), facebook: blankSource() }
  const details: Partial<Record<DetailKey, LeadRecord[]>> = {}
  let dateStart = ''
  let dateEnd = ''
  for (const location of leadReport.locations) {
    dateStart = location.date_start
    dateEnd = location.date_end
    for (const key of summaryKeys)
      addCount(summary[key], location.summary?.[key])
    for (const key of channels) {
      const source = location.lead_analytics?.[key]
      const destination = analytics[key]
      if (
        key === 'facebook' ||
        !location.lead_analytics?.adwords?.account_shared
      ) {
        destination.clicks += number(source?.clicks)
        destination.impressions += number(source?.impressions)
        destination.total_spend += number(source?.total_spend)
      }
      destination.conversions += number(source?.conversions)
    }
    for (const key of paid) {
      const source = location.details?.am?.[key]
      for (const metric of ['clicks', 'impressions', 'cpl'] as const)
        sources[key][metric] += number(source?.[metric])
      for (const countKey of ['calls', 'chats', 'forms'] as const)
        addCount(sources[key][countKey], source?.[countKey])
      for (const outcome of outcomeKeys)
        sources[key].call_summary[outcome] += number(
          (key === 'facebook' && outcome === 'unscored'
            ? location.details?.am?.adwords
            : source
          )?.call_summary?.[outcome],
        )
    }
    for (const key of detailKeys) {
      ;(details[key] ??= []).push(
        ...(location.details?.[key] ?? []).map((record) => ({
          location_name: location.location?.name,
          ...record,
        })),
      )
    }
  }
  return { summary, analytics, details, sources, dateStart, dateEnd }
}

export function leadRows(
  details: ReturnType<typeof buildLeadReport>['details'],
  key: DetailKey | 'all',
) {
  const groups: DetailKey[] =
    key === 'all' ? ['calls', 'emails', 'chats', 'facebook_leads'] : [key]
  return groups
    .flatMap((group) =>
      (details[group] ?? []).map((record, index) => {
        const call = group.includes('call')
        const chat = group.includes('chat')
        return {
          ...record,
          key: group + '-' + index,
          kind: call
            ? 'Call'
            : chat
              ? 'Chat'
              : group === 'facebook_leads'
                ? 'Facebook form'
                : 'Web form',
          name: call ? record.caller_name : record.lead?.name,
          timestamp: call
            ? record.call_start
            : chat
              ? record.chat_date
              : record.date,
          phone: call
            ? record.caller_number
            : group === 'facebook_leads'
              ? record.lead?.phone_number
              : record.lead?.phone,
          email: call ? '' : record.lead?.email,
          source: record.other_details?.lead_source ?? record.lead?.lead_source,
          procedure: call
            ? record.score?.procedure?.name
            : group === 'emails'
              ? record.lead?.procedure
              : record.procedure,
        }
      }),
    )
    .sort(
      (a, b) =>
        (Date.parse(a.timestamp || '') || 0) -
        (Date.parse(b.timestamp || '') || 0),
    )
    .reverse()
}
