import type { Envelope } from '~/types/api'

export function useReportExport() {
  const { $api } = useNuxtApp()
  const open = ref(false)
  const loading = ref(false)
  const url = ref('')
  const notice = ref('')

  async function exportReport(body: unknown) {
    open.value = true
    if (url.value) return
    loading.value = true
    try {
      const { data } = await $api.post<Envelope<{ url: string }>>(
        '/reports/upload',
        body,
      )
      url.value = data.data.url
    } catch {
      notice.value = 'Unable to export the report.'
      open.value = false
    } finally {
      loading.value = false
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      notice.value = 'Link copied to clipboard'
    } catch {
      notice.value = 'Unable to copy the link.'
    }
  }

  return { open, loading, url, notice, exportReport, copy }
}
