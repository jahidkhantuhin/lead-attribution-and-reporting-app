import { useContext, useRoute, useRouter } from '@nuxtjs/composition-api'
import isAuthenticated from '~/middleware/isAuthenticated'
import useAxios from '~/plugins/useAxios'

jest.mock('@nuxtjs/composition-api', () => ({
  useContext: jest.fn(),
  useRoute: jest.fn(),
  useRouter: jest.fn(),
}))
jest.mock('~/utils/showErrorOnXHRFail')

describe('legacy auth routing', () => {
  test.each([
    [false, ['/login']],
    [true, []],
  ])('handles authentication state %s in the route guard', (state, paths) => {
    const redirect = jest.fn()
    isAuthenticated({
      redirect,
      store: { getters: { 'users/isAuthenticated': state } },
    })
    expect(redirect.mock.calls.map(([path]) => path)).toEqual(paths)
  })

  test.each([
    [
      '/reports/kpi?client=1',
      [{ path: '/login', query: { redirect: '/reports/kpi?client=1' } }],
    ],
    ['/reports/kpi?redirect=/profile', [{ path: '/login', query: {} }]],
    ['/login', []],
  ])('handles a rejected 401 from %s', async (fullPath, redirects) => {
    const push = jest.fn()
    const register = jest.fn()
    const client = { interceptors: { response: { use: register } } }
    useRouter.mockReturnValue({ push })
    useRoute.mockReturnValue({ value: { fullPath } })
    useContext.mockReturnValue({
      app: { $axios: client, $swal: { mixin: jest.fn() } },
    })

    expect(useAxios()).toBe(client)
    const [, onError] = register.mock.calls[0]
    const error = { response: { status: 401 } }
    await expect(onError(error)).rejects.toBe(error)
    expect(push.mock.calls.map(([location]) => location)).toEqual(redirects)
  })
})
