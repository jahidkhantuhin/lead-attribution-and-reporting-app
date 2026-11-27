export const reportDate = (value = new Date()) =>
  [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-')

export function dayRange(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is string =>
      typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item),
  )
}

export function filterId(value: unknown) {
  const id = Number(Array.isArray(value) ? value[0] : value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export { dates as demoDays } from '~/showcase/fixtures'
