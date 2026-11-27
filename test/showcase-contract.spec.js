import axios from 'axios'
import { createShowcaseApi } from '~/showcase/api'
import { transformMonthlyReportIntoObject } from '~/utils/reports-upload/kpi'

const period = { date_start: '2026-01-31', date_end: '2026-02-01' }

function createClient() {
  return axios.create({
    baseURL: 'https://showcase.example.test',
    adapter: createShowcaseApi().adapter,
  })
}

describe('legacy showcase reporting and API contract', () => {
  test('builds daily KPI rows for both date boundaries and the chosen location', async () => {
    const { data } = await createClient().get('/clients/1/kpi', {
      params: { ...period, type: 'daily', location_ids: [4] },
    })

    expect(data.data).toMatchObject({
      date: period,
      client: { id: 1 },
      locations: [{ id: 4 }],
      summary: [
        { date: '2026-01-31', total_leads: 64, total_booked: 20 },
        { date: '2026-02-01', total_leads: 67, total_booked: 21 },
      ],
    })
    expect(data.data.locations).toHaveLength(1)
  })

  test('groups monthly KPI rows by year and keeps numeric report fields', async () => {
    const { data } = await createClient().get('/clients/1/kpi', {
      params: { ...period, type: 'monthly' },
    })
    const groups = transformMonthlyReportIntoObject(data.data.summary)
    expect(Object.keys(groups)).toEqual(['2026'])
    expect(groups['2026']).toMatchObject([
      { month: 'January', total_cost: 1280, total_leads: 67 },
      { month: 'February', total_cost: 1310, total_leads: 70 },
    ])
    expect(transformMonthlyReportIntoObject(undefined)).toEqual({})
  })

  test('filters lead attribution by client and locations without mixing clients', async () => {
    const { data } = await createClient().get('/leads?location_ids=2,4', {
      params: { ...period, client_id: 1 },
    })
    expect(
      data.data.locations.map((location) => location.location_id)
    ).toEqual([4])
    expect(data.data.locations[0]).toMatchObject({
      ...period,
      details: {
        calls: [
          {
            call_start: '2026-02-01T15:30:00Z',
            score: { booked_appointment: 'yes' },
          },
        ],
      },
    })
  })

  test('filters and sorts records before paginating in the nested envelope', async () => {
    const { data } = await createClient().get('/clients', {
      params: { status: 'active', sort_by: 'name:desc', page: 2, limit: 1 },
    })
    expect(data.data.result).toMatchObject([{ id: 2 }])
    expect(data.data.pagination).toEqual({
      total: 3,
      current_page: 2,
      per_page: 1,
      last_page: 3,
    })
  })

  test('returns the Axios error response for an unknown record', async () => {
    await expect(createClient().get('/clients/9999')).rejects.toMatchObject({
      response: {
        status: 404,
        data: { message: 'Showcase record not found' },
      },
    })
  })
})
