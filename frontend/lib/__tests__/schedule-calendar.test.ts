import { buildSchedulesByDate, dateKey } from '../schedule-calendar'

describe('schedule calendar helpers', () => {
  it('indexes a multi-day schedule on every day in its date range', () => {
    const schedules = [
      {
        id: 'schedule-1',
        title: 'Album outdoor',
        startAt: new Date(2026, 4, 11, 9, 0, 0).toISOString(),
        endAt: new Date(2026, 4, 13, 17, 0, 0).toISOString(),
      },
    ]

    const result = buildSchedulesByDate(schedules)

    expect(result.get(dateKey(new Date('2026-05-11T12:00:00.000Z')))?.[0].id).toBe('schedule-1')
    expect(result.get(dateKey(new Date('2026-05-12T12:00:00.000Z')))?.[0].id).toBe('schedule-1')
    expect(result.get(dateKey(new Date('2026-05-13T12:00:00.000Z')))?.[0].id).toBe('schedule-1')
    expect(result.get(dateKey(new Date('2026-05-14T12:00:00.000Z')))).toBeUndefined()
  })

  it('keeps schedules sorted by start time inside a day', () => {
    const schedules = [
      { id: 'late', title: 'Late', startAt: new Date(2026, 4, 11, 14, 0, 0).toISOString() },
      { id: 'early', title: 'Early', startAt: new Date(2026, 4, 11, 8, 0, 0).toISOString() },
    ]

    const result = buildSchedulesByDate(schedules)

    expect(result.get(dateKey(new Date('2026-05-11T10:00:00.000Z')))?.map(item => item.id)).toEqual(['early', 'late'])
  })
})
