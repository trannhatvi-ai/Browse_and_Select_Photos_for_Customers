export type CalendarSchedule = {
  id: string
  startAt: string
  endAt?: string | null
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

export function buildSchedulesByDate<T extends CalendarSchedule>(schedules: T[]) {
  const map = new Map<string, T[]>()

  for (const schedule of schedules) {
    const start = new Date(schedule.startAt)
    if (Number.isNaN(start.getTime())) continue

    const parsedEnd = schedule.endAt ? new Date(schedule.endAt) : null
    const end = parsedEnd && !Number.isNaN(parsedEnd.getTime()) && parsedEnd >= start ? parsedEnd : start
    let day = startOfDay(start)
    const lastDay = startOfDay(end)

    while (day <= lastDay) {
      const key = dateKey(day)
      map.set(key, [...(map.get(key) || []), schedule])
      day = addDays(day, 1)
    }
  }

  for (const [key, items] of map) {
    map.set(
      key,
      [...items].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    )
  }

  return map
}
