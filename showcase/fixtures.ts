export const date = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
export const dates = () => [date(-29), date()]
const timestamp = () => date() + 'T12:00:00Z'

export const scopes = [
  'view reports', 'create report', 'view client records', 'view site records',
  'view location settings', 'view vpn setup', 'vpn access', 'view all active locations',
  'view users', 'create user', 'update user', 'delete user', 'view profile',
]

function user(id: number, first_name: string, last_name: string, role: string, role_id: number) {
  return {
    id, first_name, last_name, fullname: first_name + ' ' + last_name, role, role_id,
    email: first_name.toLowerCase() + '@example.test', status: 1, created_at: timestamp(),
    updated_at: timestamp(), phone_number: '2025550102', meta: [{ name: 'dark_mode', value: '0' }],
  }
}

export const roles = [
  { id: 1, name: 'super admin' }, { id: 2, name: 'account manager' }, { id: 3, name: 'call scorer' },
  { id: 4, name: 'admin' }, { id: 5, name: 'user' },
]
export const users = [
  user(1, 'Avery', 'Morgan', 'super admin', 1),
  user(2, 'Jordan', 'Lee', 'account manager', 2),
  user(3, 'Taylor', 'Reed', 'call scorer', 3),
  user(4, 'Morgan', 'Patel', 'account manager', 2),
]

export function seed() {
  const address = { address: '100 Example Avenue', street: 'Example Avenue', state: 'OR', city: 'Portland', zip: '97201', zipcode: '97201' }
  const timestamps = { created_at: timestamp(), updated_at: timestamp() }
  const clients = ['Cedar Dental Studio', 'Harbor Wellness Group', 'Juniper Family Care'].map((name, index) => ({
    ...address, ...timestamps, id: index + 1, name, first_name: name.split(' ')[0],
    last_name: name.split(' ').slice(1).join(' '), email: 'office' + (index + 1) + '@example.test',
    phone_number: '2025550101', personal_website: 'https://office-' + (index + 1) + '.example.test', status: index === 2 ? 'trial_client' : 'paying_client',
    account_manager_id: index === 1 ? 4 : 2,
  }))
  const locations = ['Cedar Downtown', 'Harbor Eastside', 'Juniper North', 'Cedar West', 'Riverfront Intake'].map((name, index) => ({
    ...address, ...timestamps, id: index + 1, name, client_id: [1, 2, 3, 1, null][index],
    account_manager_id: index === 1 ? 4 : 2, status: index === 2 ? 'trial_client' : 'paying_client',
    website: 'https://office-' + (index + 1) + '.example.test', reporting_mail: 'reports' + (index + 1) + '@example.test',
    adwords_budget: 1200 + index * 100, facebook_budget: 420, monthly_fee: 800,
    adwords_id: '100-200-300' + index, facebook_id: '900001' + index, account_id: 'DEMO-' + (index + 1),
    apexchat_id: 'CHAT-' + (index + 1), hubspot_id: 'CRM-' + (index + 1), lh2_api_key: 'DEMO-ONLY',
    phone_number: '2025550101', phone_numbers: [{ phone_number: '2025550101', source: 'Google Ads' }],
    source: 'Google Ads', has_apex: 1, has_ppc: 1, has_seo: index % 2, location_activity_logs: index === 0 ? [{
      new_data: { name, updated_at: timestamp() }, old_data: { name: 'Cedar Main' },
      user: users[0], comment: 'Updated the location display name.',
    }] : [],
  }))
  const staff = ['Riley Chen', 'Cameron Brooks', 'Sam Rivera'].map((name, index) => ({
    ...timestamps, id: index + 1, client_id: index + 1, name, designation: 'Office Coordinator',
    email: 'staff' + (index + 1) + '@example.test', phone_number: '2025550103',
  }))
  const plugins = [{ id: 1, name: 'Example Cache', version: '2.3.0', status: 1, is_update_available: 0 }]
  const themes = [{ id: 1, name: 'Example Studio', version: '1.4.0', status: 1, is_update_available: 1 }]
  const sites = locations.slice(0, 4).map((location, index) => ({
    ...timestamps, id: index + 1, location_id: location.id, status: 1, name: location.name,
    url: location.website, siteURL: location.website, site_ip: '192.0.2.' + (10 + index),
    wp_version: '6.8', plugins, themes, avg_desktop_score: 96 - index, avg_mobile_score: 85 - index,
    avg_desktop_speed_index: 1.2 + index / 10, avg_mobile_speed_index: 2.1,
    avg_server_response_time: 0.42, site_information: [{
      url: location.website, staging_url: 'https://staging-' + location.id + '.example.test',
      registrar: 'Example Registrar', is_cloudways_hosted: 1, has_ssl: 'Yes', created: date(-365), expires: date(365),
    }],
  }))
  const vpn = sites.slice(0, 2).map((site, index) => ({
    id: index + 1, user: users[index], site, ip: '192.0.2.' + (40 + index), expiry_date: date(3),
  }))
  return { users: users.map(item => ({ ...item })), clients, locations, staff, sites, plugins, themes, vpn }
}
