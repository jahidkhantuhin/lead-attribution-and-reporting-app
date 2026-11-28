export type RecordId = number | string
export type Fields = Record<string, unknown>

export interface Envelope<T> {
  data: T
}

export interface Pagination {
  current_page: number
  per_page: number
  total: number
  last_page?: number
  total_pages?: number
}

export interface Listing<T> {
  result: T[]
  pagination: Pagination
}

export interface RecordSummary extends Fields {
  id: RecordId
  name?: string
}

export interface UserRecord extends RecordSummary {
  first_name: string
  last_name: string
  role?: string | Array<{ name: string }>
  meta?: Array<{ name: string; value: unknown }>
}

export interface SessionPayload {
  data?: UserRecord
  email?: string
  status?: string | number
  id?: RecordId
  first_name?: string
  last_name?: string
  role?: UserRecord['role']
  scope?: string[]
  meta?: UserRecord['meta']
}

export interface DateRange {
  date_start: string
  date_end: string
}

export type KpiSummary =
  | Array<{ date: string } & Fields>
  | Record<string, Record<string, { month: string } & Fields>>

export interface KpiReport extends DateRange {
  date: DateRange
  client: RecordSummary
  locations: RecordSummary[]
  summary: KpiSummary
}

export interface VpnEntry extends RecordSummary {
  ip?: string
  expiry_date?: string
  site?: { url?: string } | null
  user?: {
    first_name?: string
    last_name?: string
    status?: number | string
  } | null
}
