import { defineStore } from 'pinia'

interface Breadcrumb {
  text: string
  to: string
  exact?: boolean
  disabled?: boolean
}

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    pageTitle: '',
    breadcrumbs: [] as Breadcrumb[],
    appVersion: '1.0a',
  }),
  actions: {
    setPageTitle(title: string) {
      this.pageTitle = title
    },
    setBreadcrumbs(breadcrumbs: Breadcrumb[]) {
      this.breadcrumbs = breadcrumbs
    },
    setPageHeading({
      pageTitle,
      breadcrumbs,
    }: {
      pageTitle: string
      breadcrumbs: Breadcrumb[]
    }) {
      this.setPageTitle(pageTitle)
      this.setBreadcrumbs(
        breadcrumbs.map((item) => ({ ...item, exact: item.exact ?? true })),
      )
    },
  },
})
