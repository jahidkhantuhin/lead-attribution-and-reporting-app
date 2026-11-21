import { date, roles, scopes, seed } from './fixtures'
import { kpi, leadDetails, leadSeries, overview, siteSeries, statistics } from './reports'

type Row = Record<string, any>
type Request = { url?: string; method?: string; params?: Row; data?: any; baseURL?: string }

function ids(value: any): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values.flatMap(id => String(id?.id ?? id ?? '').split(',')).filter(Boolean)
}

function page(rows: Row[], query: Row) {
  let filtered = rows
  for (const key of ['role', 'status', 'account_manager_id', 'client_id']) {
    if (ids(query[key]).length) {
      const values = ids(query[key])
      filtered = filtered.filter(row => values.includes(String(row[key])) ||
        (values.includes('active') && ['paying_client', 'trial_client', '1'].includes(String(row[key]))) ||
        (values.includes('inactive') && ['ex_client', '0'].includes(String(row[key]))))
    }
  }
  for (const key of ['search', 'name', 'first_name', 'last_name', 'email', 'website', 'site_url', 'client_name']) {
    const filter = String(query[key] ?? '').toLowerCase().trim()
    if (!filter) continue
    const fields = key === 'search' ? ['name', 'fullname', 'email', 'website', 'url', 'siteURL'] : [key]
    filtered = filtered.filter(row => fields.some(field => String(row[field] ?? '').toLowerCase().includes(filter)))
  }
  const [column, order] = String(query.sort_by || '').split(':')
  if (column) filtered = [...filtered].sort((a, b) =>
    String(a[column] ?? '').localeCompare(String(b[column] ?? ''), 'en', { numeric: true }) * (order === 'desc' ? -1 : 1))
  const limit = Number(query.limit ?? query.per_page) || 10
  const current = Math.max(1, Number(query.page) || 1)
  const start = (current - 1) * limit
  return { result: limit < 0 ? filtered : filtered.slice(start, start + limit),
    pagination: { total: filtered.length, current_page: current, per_page: limit,
      last_page: limit < 0 ? 1 : Math.max(1, Math.ceil(filtered.length / limit)) } }
}

export function createShowcaseApi() {
  const data = seed()
  const collections: Record<string, Row[]> = {
    users: data.users, clients: data.clients, locations: data.locations, staff: data.staff,
    sites: data.sites, 'vpn-access': data.vpn,
  }
  const nextIds: Record<string, number> = {}
  const find = (collection: keyof typeof collections, id: any) =>
    collections[collection].find(row => String(row.id) === String(id))
  const manager = (row: Row) => find('users', row.account_manager_id)
  const location = (row: Row) => ({ ...row, client: find('clients', row.client_id), account_manager: manager(row)?.fullname })
  const client = (row: Row) => ({
    ...row, account_manager: manager(row),
    num_of_locations: data.locations.filter(item => String(item.client_id) === String(row.id)).length,
    locations: data.locations.filter(item => String(item.client_id) === String(row.id)).map(location),
    staff: data.staff.filter(item => String(item.client_id) === String(row.id)),
  })
  const session = () => ({ ...data.users[0], scope: [...scopes] })

  function create(collection: string, input: Row) {
    const rows = collections[collection]
    const id = nextIds[collection] ?? (Math.max(0, ...rows.map(row => Number(row.id))) + 1)
    nextIds[collection] = id + 1
    const now = new Date().toISOString()
    const { password, password_confirmation, current_password, ...fields } = input
    const row = { created_at: now, updated_at: now, ...fields, id }
    rows.push(row)
    return row
  }

  function resolve(config: Request) {
    const url = new URL(config.url || '', config.baseURL || 'https://showcase.example.test')
    const path = url.pathname.split('/').filter(Boolean)
    const [resource, id, action] = path
    const query: Row = {}
    url.searchParams.forEach((value, key) => { query[key] = value })
    Object.assign(query, config.params)
    const method = (config.method || 'get').toLowerCase()
    const body: Row = typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {}
    const row = collections[resource] && find(resource, id)

    if (url.hostname === 'api.ipify.org') return { ip: '192.0.2.42' }
    if (resource === 'sanctum' || ['login', 'logout', 'reset', 'password-reset'].includes(resource)) return {}
    if (resource === 'user') return session()
    if (resource === 'social-login-direct' || resource === 'social-login') return { user: session() }
    if (resource === 'meta') {
      const active = data.users[0]
      const value = body.value ?? body.meta_value
      if (id && value !== undefined) {
        active.meta = [...active.meta.filter(item => item.name !== id), { name: id, value }]
      }
      return {}
    }
    if (resource === 'roles') return roles
    if (resource === 'statuses') return { 'Paying Client': 'paying_client', 'Trial Client': 'trial_client', 'Ex Client': 'ex_client' }
    if (resource === 'plugins' || resource === 'themes') return data[resource]
    if (resource === 'register') {
      const role = roles.find(item => String(item.id) === String(body.role_id))?.name || 'user'
      return create('users', { ...body, role, fullname: body.first_name + ' ' + body.last_name, status: 1 })
    }
    if (resource === 'reports') {
      if (id === 'data') return statistics(query)
      if (id === 'upload') return { url: '/showcase-report.txt' }
      if (query.type === 'payment') {
        return { pay_rate: 18, cache: { created_at: new Date().toISOString() }, ratings: [
          { id: 1, name: data.clients[0].name, date: query.from || date(-2), total_calls: 24,
            total_call_duration: 3780, total_rating_time: 2520 },
          { id: 2, name: data.clients[1].name, date: query.to || date(), total_calls: 19,
            total_call_duration: 3160, total_rating_time: 2080 },
        ] }
      }
    }
    const selectedLocations = (clientId: any) => {
      const selected = ids(query.location_ids)
      return data.locations.filter(item => String(item.client_id) === String(clientId) &&
        (!selected.length || selected.includes(String(item.id))))
    }
    if (resource === 'leads') {
      return query.client_id
        ? leadDetails(query, find('clients', query.client_id) || {}, selectedLocations(query.client_id))
        : leadSeries(query)
    }
    if (resource === 'clients' && id === 'leads') {
      return overview(query, data.locations.filter(item => item.client_id &&
        (!query.account_manager_id || String(item.account_manager_id) === String(query.account_manager_id))))
    }
    if (resource === 'clients' && row && action === 'kpi') return kpi(query, row, selectedLocations(id))
    if (resource === 'clients' && row && action === 'locations') return page(selectedLocations(id), query)
    if (resource === 'sites' && row && action === 'graph') return siteSeries(query)
    if (resource === 'locations' && id === 'missing-clients') {
      return page(data.locations.filter(item => !item.client_id), query)
    }
    if (resource === 'locations' && (id === 'client' || action === 'client')) {
      if (id === 'client') {
        const owner = find('clients', body.client_id)
        if (!owner) return undefined
        for (const locationId of ids(body.location_ids)) {
          const item = find('locations', locationId)
          if (item) item.client_id = owner.id
        }
        return owner
      }
      if (!row) return undefined
      const created = create('clients', { ...row, status: 'paying_client' })
      row.client_id = created.id
      return created
    }
    if (collections[resource]) {
      if (method === 'post') {
        if (resource === 'vpn-access') return create(resource, { ip: '192.0.2.42', user: session(),
          site: find('sites', body.site_id) || data.sites[0], expiry_date: date(3) })
        return create(resource, body)
      }
      if (id && !row) return undefined
      if (row && method === 'delete') {
        if (resource === 'clients' || (resource === 'users' && Number(id) === 1)) return {}
        const rows = collections[resource]
        rows.splice(rows.indexOf(row), 1)
        return {}
      }
      if (row && method === 'put') {
        if (action === 'change-status') row.status = row.status === 'paying_client' ? 'ex_client' : 'paying_client'
        else {
          const { password, password_confirmation, current_password, ...fields } = body
          Object.assign(row, fields, { id: row.id, updated_at: new Date().toISOString() })
          if (resource === 'users') {
            row.fullname = row.first_name + ' ' + row.last_name
            if (row.id !== 1) row.role = roles.find(item => String(item.id) === String(row.role_id))?.name || row.role
          }
        }
        return row
      }
      if (resource === 'clients') return row ? client(row) : page(data.clients.map(client), query)
      if (resource === 'locations') return row ? location(row) : page(data.locations.map(location), query)
      if (resource === 'staff' && row) return { ...row, client: find('clients', row.client_id) }
      if (resource === 'sites') {
        const site = (value: Row, detail: boolean) => {
          const linked = find('locations', value.location_id)
          const owner = linked && find('clients', linked.client_id)
          return { ...value, plugins: detail ? value.plugins : value.plugins.map((plugin: Row) => plugin.name).join(', '),
            accountManager: linked && manager(linked)?.fullname,
            location: linked && { ...linked, client: detail ? owner : owner?.name } }
        }
        if (row) return site(row, true)
        const pluginIds = ids(query.plugin)
        const themeIds = ids(query.theme)
        const matching = data.sites.filter(item =>
          (!pluginIds.length || item.plugins.some(plugin => pluginIds.includes(String(plugin.id)))) &&
          (!themeIds.length || item.themes.some(theme => themeIds.includes(String(theme.id)))) &&
          item.avg_mobile_score >= Number(query.speed_score_min ?? 0) &&
          item.avg_mobile_score <= Number(query.speed_score_max ?? 100))
        return page(matching.map(item => site(item, false)), query)
      }
      return row || page(collections[resource], query)
    }
    return undefined
  }

  async function adapter(config: Request) {
    const value = resolve(config)
    const ipLookup = config.baseURL?.includes('api.ipify.org')
    const response = { config, status: value === undefined ? 404 : 200,
      statusText: value === undefined ? 'Not Found' : 'OK', headers: {},
      data: ipLookup ? value : value === undefined ? { message: 'Showcase record not found' } :
        { data: JSON.parse(JSON.stringify(value)) } }
    if (value === undefined) throw Object.assign(new Error('Showcase record not found'), { response, config })
    return response
  }

  return { adapter, session }
}
