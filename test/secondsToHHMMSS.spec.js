import secondsToHHMMSS from '@/utils/secondsToHHMMSS'

describe('payment report duration formatting', () => {
  test.each([
    [0, '00:00'],
    [65, '01:05'],
    [3661, '01:01:01'],
    ['125', '02:05'],
  ])('formats %p seconds as %s', (seconds, expected) => {
    expect(secondsToHHMMSS(seconds)).toBe(expected)
  })
})
