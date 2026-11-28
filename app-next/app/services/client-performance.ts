import { reportPages } from '~/constants'
import type { Fields, RecordId } from '~/types/api'
import schemas from './client-performance-columns.json'

export interface PerformanceRow extends Fields {
  client_id: RecordId
  location_id: RecordId
  location: {
    id: RecordId
    name: string
    account_manager?: string
    adwords_budget?: number | string
    facebook_budget?: number | string
    monthly_fee?: number | string
  }
}
export interface PerformanceReport {
  date?: { date_start: string; date_end: string }
  cache?: { cache?: { created_at: string } }
  summary: Array<
    PerformanceRow | { ref_month: PerformanceRow; comp_month: PerformanceRow }
  >
}

export type PerformanceMode = keyof typeof schemas
export const performanceColumns = (mode: PerformanceMode) => schemas[mode]

const number = (value: unknown) => Number(value) || 0
const rounded = (value: unknown) => (value ? number(value).toFixed(0) : 0)
export const isComparison = (
  value: PerformanceReport['summary'][number],
): value is { ref_month: PerformanceRow; comp_month: PerformanceRow } =>
  'ref_month' in value && 'comp_month' in value

export function periodRange(month: string) {
  const [year, number] = month.split('-').map(Number)
  if (!year || !number) return []
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate()
  return [month + '-01', month + '-' + last]
}

function periodMonths([start, end]: string[]) {
  if (!start || !end) return 1
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1
  return Math.max(1, Math.ceil(days / 30))
}

export function standardPerformance(row: PerformanceRow, dates: string[]) {
  const budget =
    number(rounded(row.location.adwords_budget)) +
    number(rounded(row.location.facebook_budget))
  const spend = rounded(row.total_aggregate_cost)
  const organic = /seo/i.test(row.location.name)
  const leads = number(row.total_leads)
  return {
    ...row,
    location: {
      ...row.location,
      adwords_budget: rounded(row.location.adwords_budget),
      facebook_budget: rounded(row.location.facebook_budget),
      monthly_fee: rounded(row.location.monthly_fee) || '0',
    },
    total_adwords_cost: rounded(row.total_adwords_cost),
    adword_cpl: rounded(row.adword_cpl),
    adwords_days_live: row.adwords_days_live
      ? String(number(row.adwords_days_live))
      : 0,
    fb_days_live: row.fb_days_live ? String(number(row.fb_days_live)) : 0,
    total_facebook_cost: rounded(row.total_facebook_cost),
    facebook_cpl: rounded(row.facebook_cpl),
    total_aggregate_cost: spend,
    total_budget: budget.toFixed(0),
    percentageOf_budget_spent:
      budget && number(spend)
        ? ((number(spend) / (budget * periodMonths(dates))) * 100).toFixed(0) +
          '%'
        : '0%',
    total_cpl: organic
      ? leads && number(row.location.monthly_fee)
        ? (number(row.location.monthly_fee) / leads).toFixed(0)
        : 0
      : Number(row.cpl).toFixed(0),
    total_voice_mail_booking: row.total_voice_mail_booking || 0,
    total_trends: rounded(row.total_trends),
    predicted_spend: rounded(row.predicted_spend),
  }
}

function comparisonBudgetSpent(row: PerformanceRow, budget: string) {
  const cost = number(row.total_aggregate_cost)
  return cost && number(budget)
    ? ((cost / number(budget)) * 100).toFixed(2)
    : '0'
}

export function comparisonPerformance(
  reference: PerformanceRow,
  comparison: PerformanceRow,
  referenceMonth: string,
  comparisonMonth: string,
): Fields {
  const row: Fields = {
    client: reference.location.name,
    client_id: reference.client_id,
    location_id: reference.location_id,
    account_manager: reference.location.account_manager,
  }
  const ref = standardPerformance(reference, periodRange(referenceMonth))
  const comp = standardPerformance(comparison, periodRange(comparisonMonth))
  const metrics = new Set(
    schemas.comparison
      .concat(schemas.organicComparison)
      .map(({ value }) => value)
      .filter((value) => value.startsWith('ref_month_'))
      .map((value) => value.slice('ref_month_'.length)),
  )
  const metricValue = (
    value: ReturnType<typeof standardPerformance>,
    key: string,
  ): unknown =>
    key === 'monthly_fee' ||
    key === 'adwords_budget' ||
    key === 'facebook_budget'
      ? value.location[key]
      : key === 'facebook_days_live'
        ? value.fb_days_live
        : (value as Fields)[key]

  for (const key of metrics) {
    const referenceValue = metricValue(ref, key)
    const comparisonValue = metricValue(comp, key)
    const a = number(referenceValue)
    const b = number(comparisonValue)
    const diff = key === 'total_leads' && (!a || !b) ? 0 : a - b
    row['ref_month_' + key] = referenceValue ?? 0
    row['comp_month_' + key] = comparisonValue ?? 0
    row['diff_of_' + key] = String(diff)
    row['percentage_diff_of_' + key] =
      diff && b ? ((diff / b) * 100).toFixed(2) : '0'
  }
  const referenceBudgetSpent = comparisonBudgetSpent(
    reference,
    ref.total_budget,
  )
  const comparisonBudgetUsed = comparisonBudgetSpent(
    comparison,
    comp.total_budget,
  )
  row.ref_month_percentageOf_budget_spent = referenceBudgetSpent
  row.comp_month_percentageOf_budget_spent = comparisonBudgetUsed
  row.diff_of_percentageOf_budget_spent = (
    Number(referenceBudgetSpent) - Number(comparisonBudgetUsed)
  ).toFixed(2)
  return row
}

export function field(row: Fields, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (value, segment) =>
        typeof value === 'object' && value !== null
          ? (value as Fields)[segment]
          : undefined,
      row,
    )
}

export function performanceExport(
  rows: Fields[],
  mode: PerformanceMode,
  dates: string[],
  author: string,
) {
  const title = reportPages.client.title
  const columns = schemas[mode].filter(
    (column) =>
      !('displayInExcel' in column) || column.displayInExcel !== false,
  )
  const exportDate = (date: string | undefined) =>
    (date || new Date().toISOString().slice(0, 10)).replace(
      /^(\d{4})-(\d{2})-(\d{2})$/,
      '$1-$3-$2',
    )
  return {
    type: 'client-overview-report',
    name: `${title}, ${exportDate(dates[0])}-to-${exportDate(dates[1])}, Generated by ${author}`,
    sheets: [
      {
        title: mode === 'organic' ? 'SEO COR report' : title,
        headings: {
          rowStyle: {
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#f6f6f6',
            bgColor: '#727272',
            width: '30px',
            textAlign: 'left',
          },
          data: columns.map(({ text, styles }) => ({ value: text, styles })),
        },
        content: rows.map((row) => ({
          rowStyle: {},
          data: columns.map(({ value, styles }) => ({
            value: field(row, value) || '',
            styles,
          })),
        })),
      },
    ],
  }
}
