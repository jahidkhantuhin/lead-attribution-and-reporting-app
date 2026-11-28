import type { UserRecord } from '~/types/api'

export function memberRoles(member: UserRecord) {
  return typeof member.role === 'string'
    ? [member.role]
    : (member.role?.map(({ name }) => name) ?? [])
}

export function canManageMember(
  member: UserRecord,
  actorRoles: string[] | null,
) {
  return (
    !memberRoles(member).includes('admin') ||
    Boolean(actorRoles?.includes('super admin'))
  )
}

export function validatePassword(value: string) {
  return (
    (value.length >= 8 &&
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value)) ||
    'Use at least eight characters with uppercase, lowercase, a number, and a special character.'
  )
}
