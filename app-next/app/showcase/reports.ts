import { date } from './fixtures'

const range = (query: Record<string, unknown>) => ({
  date_start: String(query.date_start || date(-29)),
  date_end: String(query.date_end || date()),
})

function series(
  query: Record<string, unknown>,
  summary: (index: number) => object,
) {
  const { date_start, date_end } = range(query)
  const start = Date.parse(date_start)
  const end = Date.parse(date_end)
  const days = Math.max(
    1,
    Math.min(366, Math.floor((end - start) / 86400000) + 1 || 1),
  )
  return Array.from({ length: days }, (_, index) => ({
    date: Number.isFinite(start)
      ? new Date(start + index * 86400000).toISOString().slice(0, 10)
      : date(),
    summary: summary(index),
  }))
}

export const leadSeries = (query: Record<string, unknown>) =>
  series(query, (index) => ({
    calls: 8 + (index % 7),
    chats: 3 + (index % 5),
    emails: 2 + (index % 4),
  }))

export const siteSeries = (query: Record<string, unknown>) =>
  series(query, (index) => ({
    mobile_score: 82 + (index % 9),
    desktop_score: 91 + (index % 7),
    mobile_speed_index: 2.1 + (index % 4) / 10,
    desktop_speed_index: 1.3 + (index % 4) / 10,
    server_response_time: 0.4 + (index % 4) / 100,
    desktop_first_contentful_paint: 0.9,
    mobile_first_contentful_paint: 1.6,
  }))

const totals = (index: number) => ({
  total_calls: 34 + index,
  total_forms: 12 + index,
  total_chats: 18 + index,
  total_leads: 64 + index * 3,
  total_booked: 20 + index,
  total_not_booked: 7,
  total_missed: 3,
  total_irrelevant: 2,
  total_not_scored: 2,
  total_voice_mail_booking: 0,
  total_adwords_calls: 25,
  total_adwords_forms: 12 + index,
  total_adwords_chats: 13 + index,
  total_adwords_leads: 50 + index * 2,
  total_facebook_calls: 9 + index,
  total_facebook_forms: 0,
  total_facebook_chats: 5,
  total_facebook_leads: 14 + index,
  total_cost: 1250 + index * 30,
  total_aggregate_cost: 1250 + index * 30,
  total_adwords_cost: 900,
  total_facebook_cost: 350 + index * 30,
  adwords_clicks: 310,
  adwords_impressions: 4800,
  adwords_cost: 900,
  adwords_conversions: 49,
  total_adwords_cpc: 2.9,
  adwords_cpl: 18,
  fb_cost: 350,
  fb_conversions: 14,
  fb_clicks: 120,
  fb_impressions: 3300,
  fb_cpl: 25,
  fb_avg_cpc: 2.92,
  total_clicks: 430,
  total_impressions: 8100,
  total_conversions: 63,
  total_cpc: 2.91,
  total_cpl: 19.53,
  cpl: 19.53,
  conversion_percentage: '14.7%',
})

export function kpi(
  query: Record<string, unknown>,
  client: object,
  locations: object[],
) {
  const rows = series(query, totals)
  const monthly: Record<string, Record<string, object>> = {}
  for (const row of rows) {
    const year = row.date.slice(0, 4)
    const month = row.date.slice(5, 7)
    const yearMonths = (monthly[year] ??= {})
    yearMonths[month] = {
      ...totals(Number(month)),
      month: new Date(row.date + 'T12:00:00Z').toLocaleDateString('en-US', {
        month: 'long',
        timeZone: 'UTC',
      }),
    }
  }
  return {
    ...range(query),
    date: range(query),
    client,
    locations,
    summary:
      query.type === 'daily'
        ? rows.map((row) => ({ date: row.date, ...row.summary }))
        : monthly,
  }
}

export function overview(
  query: Record<string, unknown>,
  locations: Record<string, unknown>[],
) {
  const summary = locations.map((location, index) => ({
    ...totals(index),
    location_id: location.id,
    client_id: location.client_id,
    location,
    account_manager_id: location.account_manager_id,
  }))
  return {
    date: range(query),
    cache: { cache: { created_at: new Date().toISOString() } },
    summary:
      query.ref_month || query.comp_month
        ? summary.map((row, index) => ({
            ref_month: row,
            comp_month: { ...row, ...totals(index + 4) },
          }))
        : summary,
  }
}

const count = (total: number) => ({ total, unique: total })
export function leadDetails(
  query: Record<string, unknown>,
  client: object,
  locations: { id: number; name: string }[],
) {
  return {
    ...client,
    locations: locations.map((location) => {
      const dates = range(query)
      const timestamp = dates.date_end + 'T15:30:00Z'
      const lead = {
        name: 'Jamie Ellis',
        email: 'jamie@example.test',
        phone: '2025550104',
        phone_number: '2025550104',
        procedure: 'Consultation',
        message: 'I would like to schedule a consultation.',
        page_visited: 'https://intake.example.test',
      }
      const row = (source: string) => ({
        id: location.id,
        lead: { ...lead, lead_source: source },
        date: timestamp,
        chat_date: timestamp,
        created: timestamp,
        local_date: timestamp,
        call_start: timestamp,
        caller_name: lead.name,
        caller_number: lead.phone,
        call_duration: 128,
        campaign: { name: 'Consultation appointments', timezone: 'US/Eastern' },
        location_name: location.name,
        call_url: '',
        referrer: 'https://intake.example.test',
        chat: 'Visitor: Can I schedule a consultation?\nAgent: Yes, I can help you find an opening.',
        other_details: {
          lead_source: source,
          answering_number: '2025550105',
          marketing_number: '2025550106',
          landing_page_url: 'https://intake.example.test',
        },
        score: {
          call_status: 'live_answer_booked',
          booked_appointment: 'yes',
          procedure: { name: 'Consultation' },
          comment: 'The caller booked a consultation.',
        },
      })
      const channel = {
        total_spend: 420,
        impressions: 2750,
        clicks: 140,
        conversions: 12,
        cpl: 35,
        total_unique_leads: 12,
        calls: count(3),
        chats: count(3),
        forms: count(3),
        call_summary: {
          booked: 1,
          not_booked: 1,
          missed: 1,
          irrelevant: 0,
          unscored: 0,
        },
      }
      return {
        ...dates,
        location,
        location_id: location.id,
        location_name: location.name,
        summary: {
          calls: count(3),
          chats: count(3),
          emails: count(2),
          facebook_leads: count(1),
        },
        lead_analytics: {
          adwords: channel,
          facebook: channel,
          aggregate: { ...channel, total_spend: 840 },
        },
        details: {
          calls: [row('Google Ads')],
          adwords_calls: [row('Google Ads')],
          facebook_calls: [row('Facebook')],
          seo_calls: [row('Organic Search')],
          chats: [row('Google Ads')],
          adwords_chats: [row('Google Ads')],
          facebook_chats: [row('Facebook')],
          seo_chats: [row('Organic Search')],
          emails: [row('Google Ads')],
          facebook_leads: [row('Facebook')],
          seo_emails: [row('Organic Search')],
          am: {
            adwords: channel,
            facebook: channel,
            seo: channel,
            aggregate: channel,
          },
        },
      }
    }),
  }
}

export function statistics(query: Record<string, unknown>) {
  const result: Record<string, object[]> = {}
  for (const { date: day } of series(query, () => ({}))) {
    const month = day.slice(0, 7)
    if (result[month]) continue
    const month_year = new Date(month + '-15T12:00:00Z').toLocaleDateString(
      'en-US',
      { month: 'long', year: 'numeric', timeZone: 'UTC' },
    )
    const trend = [0, 7, 4, 11, 8, 15][Object.keys(result).length % 6] ?? 0
    result[month] = [
      ['call', 'booked', 163 + trend * 2],
      ['call', 'not booked', 41 + trend],
      ['call', 'irrelevant', 14],
      ['call', 'missed', 32 + (trend % 5)],
      ['call', 'unscored', 18],
      ['call', null, 268 + trend * 5],
      ['chat', null, 81 + trend * 2],
      ['email', null, 62 + trend],
    ].map(([lead_type, conversion_status, total_leads]) => ({
      month_year,
      lead_type,
      conversion_status,
      total_leads,
    }))
  }
  return result
}
