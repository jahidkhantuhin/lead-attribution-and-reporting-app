type ReportColumn = { value: string; text: string }

export function reportTableHeaders<T extends ReportColumn>(columns: T[]) {
  return columns
    .filter((column) => column.value && column.text.trim())
    .map((column, index) => {
      const key = column.value
      const identity = /^(date|month|client|location\.name|location\.account_manager|account_manager|actions)$/.test(
        key
      )
      const group = identity
        ? 'context'
        : /adword|google/.test(key)
        ? 'search'
        : /facebook|(^|_)fb_/.test(key)
        ? 'social'
        : /booked|missed|irrelevant|voice_mail|unscored/.test(key)
        ? 'outcomes'
        : 'metrics'
      const emphasis = index === 0 ? ' report-column--anchor' : ''

      return {
        ...column,
        align: identity ? 'start' : 'end',
        class: `report-column--${group}${emphasis}`,
        cellClass: `report-column--${group}${emphasis}`,
      }
    })
}
