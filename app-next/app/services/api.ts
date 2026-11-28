import type { AxiosInstance } from 'axios'
import type { ClientRecord, DirectoryEntry } from './client-records'
import type { SiteDay, SiteRecord } from './site-records'
import type {
  Envelope,
  Fields,
  KpiReport,
  Listing,
  RecordId,
  RecordSummary,
  UserRecord,
  VpnEntry,
} from '../types/api'

export function createServices(api: AxiosInstance) {
  const get = <T>(url: string, params?: Fields) =>
    api.get<Envelope<T>>(url, { params })
  const list = <T>(url: string, params?: Fields) => get<Listing<T>>(url, params)
  const post = <T>(url: string, body: unknown) =>
    api.post<Envelope<T>>(url, body)
  const put = <T>(url: string, body: unknown) => api.put<Envelope<T>>(url, body)
  const remove = (url: string, data?: Fields) => api.delete(url, { data })

  return {
    clients: {
      list: (filters?: Fields) => list<ClientRecord>('/clients', filters),
      statuses: () => get<Record<string, string>>('/statuses'),
      byId: (id: RecordId) => get<ClientRecord>(`/clients/${id}`),
      create: (body: Fields) => post<RecordSummary>('/clients', body),
      update: (body: Fields & { id: RecordId }) =>
        put<RecordSummary>(`clients/${body.id}`, body),
      changeStatus: (id: RecordId) =>
        put<RecordSummary>(`clients/${id}/change-status`, {}),
      remove: (id: RecordId) => remove(`/clients/${id}`),
    },
    locations: {
      list: (filters?: Fields) => list<DirectoryEntry>('/locations', filters),
      byId: (id: RecordId) => get<RecordSummary>(`/locations/${id}`),
      byClient: (id: RecordId) =>
        list<RecordSummary>(`/clients/${id}/locations`),
      create: (body: Fields) => post<RecordSummary>('/locations', body),
      update: (body: Fields & { id: RecordId }) =>
        put<RecordSummary>(`/locations/${body.id}`, body),
      remove: (id: RecordId) => remove(`/locations/${id}`),
      missingClients: (filters?: Fields) =>
        list<DirectoryEntry>('/locations/missing-clients', filters),
      assignClient: (body: Fields) =>
        post<RecordSummary>('locations/client', body),
      createClient: (id: RecordId) =>
        put<RecordSummary>(`/locations/${id}/client`, null),
    },
    vpn: {
      list: (filters?: Fields) => list<VpnEntry>('/vpn-access', filters),
      request: (body: Fields) => post<VpnEntry>('/vpn-access', body),
      remove: (id: RecordId) => remove(`/vpn-access/${id}`),
      publicIp: () =>
        api.get<{ ip?: string }>('', {
          baseURL: 'https://api.ipify.org/?format=json',
          withCredentials: false,
          withXSRFToken: false,
        }),
    },
    staff: {
      byId: (id: RecordId) => get<RecordSummary>(`/staff/${id}`),
      create: (body: Fields) => post<RecordSummary>('/staff', body),
      update: (body: Fields & { id: RecordId }) =>
        put<RecordSummary>(`/staff/${body.id}`, body),
      remove: (id: RecordId) => remove(`/staff/${id}`),
    },
    sites: {
      list: (filters?: Fields) => list<SiteRecord>('/sites', filters),
      byId: (id: RecordId) => get<SiteRecord>(`/sites/${id}`),
      graph: (id: RecordId, filters: Fields) =>
        get<SiteDay[]>('/sites/' + id + '/graph', filters),
      plugins: () => get<RecordSummary[]>('/plugins'),
      themes: () => get<RecordSummary[]>('/themes'),
    },
    users: {
      list: (filters?: Fields) => list<UserRecord>('/users', filters),
      byId: (id: RecordId) => get<UserRecord>(`/users/${id}`),
      create: (body: Fields) => post<UserRecord>('register', body),
      update: (body: Fields & { id: RecordId }) =>
        put<UserRecord>(`users/${body.id}`, body),
      remove: (id: RecordId) => remove(`users/${id}`, {}),
      roles: () => get<Array<{ id: RecordId; name: string }>>('/roles'),
    },
    reports: {
      kpi: (filters: Fields & { client_id: RecordId }) =>
        get<KpiReport>(`/clients/${filters.client_id}/kpi`, filters),
    },
  }
}
