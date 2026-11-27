import axios, { type AxiosAdapter, type AxiosInstance } from 'axios'

interface ClientOptions {
  baseURL: string
  showcaseAdapter?: AxiosAdapter
  accessToken: () => string | null
  onUnauthorized: () => void
}

export function createApiClient({
  baseURL,
  showcaseAdapter,
  accessToken,
  onUnauthorized,
}: ClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    withXSRFToken: true,
  })

  client.interceptors.request.use((config) => {
    if (showcaseAdapter) {
      config.adapter = showcaseAdapter
      return config
    }

    // The connected session must never be sent to an alternate origin.
    if (!baseURL) throw new Error('Connected API URL is missing')
    const server = new URL(baseURL)
    const target = new URL(client.getUri(config), server)
    if (target.origin === server.origin) {
      const token = accessToken()
      if (token && !config.headers.has('Authorization')) {
        config.headers.set('Authorization', `Bearer ${token}`)
      }
    } else {
      config.withCredentials = false
      config.withXSRFToken = false
    }
    return config
  })

  client.interceptors.response.use(
    (response) => {
      if (response.status === 401 && !response.config.url?.includes('noswal')) {
        onUnauthorized()
      }
      return response
    },
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        if (!error.config?.url?.includes('noswal')) onUnauthorized()
      }
      return Promise.reject(error)
    },
  )

  return client
}
