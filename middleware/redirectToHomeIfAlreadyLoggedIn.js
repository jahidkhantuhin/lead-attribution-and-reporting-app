export default function ({ store }) {
  const isAuthenticated = !!store.getters['users/isAuthenticated']
  if (isAuthenticated) {
    // redirect({path: '/'})
  }
}
