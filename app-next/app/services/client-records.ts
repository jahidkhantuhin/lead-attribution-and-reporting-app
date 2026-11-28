import type { RecordSummary } from '~/types/api'

export interface DirectoryEntry extends RecordSummary {
  email?: string
  phone_number?: string
  status?: string
  designation?: string
  website?: string
}

export interface ClientRecord extends DirectoryEntry {
  address?: string
  city?: string
  state?: string
  zipcode?: string
  num_of_locations?: number
  account_manager?: { first_name?: string; last_name?: string } | null
  locations?: DirectoryEntry[]
  staff?: DirectoryEntry[]
}

export function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

export function nestedRecordMatchesClient(
  record: RecordSummary,
  clientId: string,
) {
  const owner = record.client
  const nestedId =
    owner && typeof owner === 'object' && 'id' in owner ? owner.id : undefined
  const ownerId = record.client_id ?? nestedId
  return typeof ownerId === 'string' || typeof ownerId === 'number'
    ? String(ownerId) === clientId
    : record.client_id !== null
}
