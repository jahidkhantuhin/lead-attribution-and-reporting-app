export type RecordKind = 'clients' | 'locations' | 'staff'
type Field = {
  key: string
  label: string
  required?: boolean
  type?: 'email' | 'url' | 'digits' | 'select' | 'textarea'
}

export const recordLabels = {
  clients: 'Client',
  locations: 'Location',
  staff: 'Staff',
}

const manager: Field = {
  key: 'account_manager_id',
  label: 'Account manager',
  required: true,
  type: 'select',
}

export const recordFields: Record<RecordKind, Field[]> = {
  clients: [
    { key: 'last_name', label: 'Last name', required: true },
    { key: 'first_name', label: 'First name', required: true },
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'phone_number', label: 'Phone', required: true },
    { key: 'personal_website', label: 'Website', type: 'url' },
    manager,
  ],
  locations: [
    { key: 'name', label: 'Name', required: true },
    { key: 'address', label: 'Address', required: true },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zip', label: 'ZIP code', required: true },
    { key: 'website', label: 'Website', required: true, type: 'url' },
    manager,
    { key: 'status', label: 'Status', required: true, type: 'select' },
    { key: 'apexchat_id', label: 'ApexChat ID' },
    { key: 'account_id', label: 'Marchex ID', required: true },
    {
      key: 'reporting_mail',
      label: 'Reporting email',
      required: true,
      type: 'email',
    },
    { key: 'facebook_id', label: 'Facebook ID' },
    { key: 'adwords_id', label: 'Google Ads ID' },
    { key: 'adwords_budget', label: 'Google Ads budget', type: 'digits' },
    { key: 'facebook_budget', label: 'Facebook budget', type: 'digits' },
    { key: 'monthly_fee', label: 'Monthly fee', type: 'digits' },
  ],
  staff: [
    { key: 'name', label: 'Name', required: true },
    { key: 'phone_number', label: 'Phone' },
    { key: 'email', label: 'Email', required: true, type: 'email' },
    { key: 'designation', label: 'Designation', required: true },
  ],
}

export function validateRecordField(field: Field, value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return !field.required || field.label + ' is required'
  if (field.type === 'email')
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || 'Enter a valid email'
  if (field.type === 'digits')
    return /^\d+$/.test(text) || 'Enter a whole number'
  if (field.type === 'url')
    return (
      /^https?:\/\/[^\s]+$/i.test(text) ||
      'Enter a URL starting with https:// or http://'
    )
  return true
}
