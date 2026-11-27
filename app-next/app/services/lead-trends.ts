import { reportPages } from '~/constants'

interface TrendRecord {
  month_year: string
  lead_type: string
  conversion_status: string | null
  total_leads: number
}
export type TrendReport = Record<string, TrendRecord[]>

const seriesDefinitions = [
  { name: 'All Calls', key: 'total_calls', type: 'call', outcome: null },
  { name: 'Emails', key: 'total_forms', type: 'email' },
  { name: 'Chat', key: 'total_chats', type: 'chat' },
  {
    name: 'Calls Unscored',
    key: 'total_not_scored',
    type: 'call',
    outcome: 'unscored',
  },
  {
    name: 'Irrelevant Calls',
    key: 'total_irrelevant',
    type: 'call',
    outcome: 'irrelevant',
    color: '#2196F3',
  },
  {
    name: 'Missed Calls',
    key: 'total_missed',
    type: 'call',
    outcome: 'missed',
    color: '#e0de1b',
  },
  {
    name: 'Booked Calls',
    key: 'total_booked',
    type: 'call',
    outcome: 'booked',
    color: '#4CAF50',
  },
  {
    name: 'Not Booked Calls',
    key: 'total_not_booked',
    type: 'call',
    outcome: 'not booked',
    color: '#F44336',
  },
]

const exportColumns = [
  ['Month Year', 'month_year', '25px'],
  ['Total calls', 'total_calls', '15px'],
  ['Avg total calls', 'avg_total_calls', '20px'],
  ['Total forms', 'total_forms', '15px'],
  ['Avg total forms', 'avg_total_forms', '20px'],
  ['Total chats', 'total_chats', '15px'],
  ['Avg total chats', 'avg_total_chats', '20px'],
  ['Total booked', 'total_booked', '15px', '#13f29a'],
  ['Total not booked', 'total_not_booked', '20px', '#f44336'],
  ['Total missed', 'total_missed', '15px', '#f4ba0b'],
  ['Total irrelevant', 'total_irrelevant', '15px', '#2986cc'],
  ['Total not scored', 'total_not_scored', '20px'],
] as const

export function buildTrends(report: TrendReport) {
  const months = Object.keys(report)
  const getValue = (
    rows: TrendRecord[],
    type: string,
    outcome?: string | null,
  ) =>
    rows.find(
      (item) =>
        item.lead_type === type &&
        (outcome === undefined || item.conversion_status === outcome),
    )?.total_leads || 0

  const series = seriesDefinitions.map(({ name, type, outcome, color }) => ({
    name,
    ...(color ? { color } : {}),
    data: months.map((month) => getValue(report[month] ?? [], type, outcome)),
  }))

  const rows = months.map((month) => {
    const monthRows = report[month] ?? []
    const total = Object.fromEntries(
      seriesDefinitions.map(({ key, type, outcome }) => [
        key,
        getValue(monthRows, type, outcome),
      ]),
    )
    // Preserve the legacy export's fixed February denominator.
    const days =
      [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
        Number(month.slice(5, 7)) - 1
      ] ?? 30
    const result: Record<string, string | number> = {
      month_year: monthRows[0]?.month_year ?? month,
      ...total,
      avg_total_calls: ((total.total_calls ?? 0) / days).toFixed(2),
      avg_total_forms: ((total.total_forms ?? 0) / days).toFixed(2),
      avg_total_chats: ((total.total_chats ?? 0) / days).toFixed(2),
    }
    return result
  })

  return { months, series, rows }
}

export function trendExport(rows: ReturnType<typeof buildTrends>['rows']) {
  const title = reportPages.trends.title
  const rowStyle = { width: '30px', textAlign: 'left', fontWeight: 'bold' }
  return {
    type: 'statistics-report',
    name: title,
    sheets: [
      {
        title,
        headings: {
          rowStyle: {
            ...rowStyle,
            fontSize: '12px',
            color: '#f6f6f6',
            bgColor: '#727272',
          },
          data: exportColumns.map(([value, , width, bgColor]) => ({
            value,
            styles: { width, ...(bgColor ? { bgColor } : {}) },
          })),
        },
        content: rows.map((row) => ({
          rowStyle: { ...rowStyle, fontSize: '10px', color: '', bgColor: '' },
          data: exportColumns.map(([, key, width, bgColor]) => ({
            value: row[key] || '',
            styles: { width, ...(bgColor ? { bgColor } : {}) },
          })),
        })),
      },
    ],
  }
}
