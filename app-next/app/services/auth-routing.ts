export function loginRedirect(path: string) {
  return {
    path: '/login',
    query: path.includes('redirect=') ? {} : { redirect: path },
  }
}

export function isLegacyAuthRoute(path: string) {
  return ['/login', '/reset-password', '/forgot-password'].some((part) =>
    path.includes(part),
  )
}
