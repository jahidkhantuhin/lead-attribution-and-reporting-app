import type { Listing, RecordId } from '~/types/api'

const batchSize = 100

export async function loadAssignmentOptions<T extends { id: RecordId }>(
  fetchPage: (page: number, limit: number) => Promise<Listing<T>>,
  active: () => boolean,
) {
  const records = new Map<string, T>()
  let lastPage = 1
  for (let page = 1; page <= lastPage && active(); page++) {
    const { result, pagination } = await fetchPage(page, batchSize)
    if (!active()) break
    lastPage =
      pagination.last_page ??
      pagination.total_pages ??
      Math.ceil(pagination.total / (pagination.per_page || batchSize))
    if (
      page < lastPage &&
      (!result.length || result.every(({ id }) => records.has(String(id))))
    ) {
      throw new Error('Assignment list pagination did not advance')
    }
    for (const record of result) records.set(String(record.id), record)
  }
  return [...records.values()]
}
