export function loginRedirect(path: string) {
  return {
    path: '/login',
    query: path.includes('redirect=') ? {} : { redirect: path },
  }
}

export function isLegacyAuthRoute(path: string) {
  return [
    '/login',
    '/reset-password',
    '/forgot-password',
    '/social-login',
  ].some((part) => path.includes(part))
}

export function safeAuthRedirect(value: unknown, fallback: string) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    [...value].some((character) => character.charCodeAt(0) <= 32)
  )
    return fallback
  const path = new URL(value, 'https://leadlens.example').pathname
  return isLegacyAuthRoute(path) ? fallback : value
}
