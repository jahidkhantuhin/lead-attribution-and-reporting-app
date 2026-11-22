export default function ({ redirect, store }) {
  const isAuthenticated = !!store.getters['users/isAuthenticated']
  // If the user is not authenticated
  if (!isAuthenticated) {
    return redirect('/login')
  }
}
