'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BellRing, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Channel = 'email' | 'telegram' | 'facebook'
type ScheduleStatus = 'PLANNED' | 'CONFIRMED' | 'SHOOTING' | 'COMPLETED' | 'CANCELLED'

type ProjectOption = {
  id: string
  eventName: string
  clientName: string
  clientEmail: string
  eventDate: string
}

type ShootSchedule = {
  id: string
  projectId?: string | null
  project?: { id: string; eventName: string; clientName: string; clientEmail: string } | null
  title: string
  clientName?: string | null
  clientEmail?: string | null
  location?: string | null
  notes?: string | null
  startAt: string
  endAt?: string | null
  reminderAt?: string | null
  reminderSentAt?: string | null
  notificationChannels?: Channel[]
  status: ScheduleStatus
}

type ScheduleForm = {
  id?: string
  title: string
  projectId: string
  clientName: string
  clientEmail: string
  location: string
  notes: string
  startAt: string
  endAt: string
  reminderAt: string
  notificationChannels: Channel[]
  status: ScheduleStatus
}

const statusLabels: Record<ScheduleStatus, string> = {
  PLANNED: 'Dự kiến',
  CONFIRMED: 'Đã xác nhận',
  SHOOTING: 'Đang chụp',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

const statusStyles: Record<ScheduleStatus, string> = {
  PLANNED: 'bg-slate-500/10 text-slate-700 border-slate-200',
  CONFIRMED: 'bg-sky-500/10 text-sky-700 border-sky-200',
  SHOOTING: 'bg-amber-500/10 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-500/10 text-red-700 border-red-200',
}

const channelLabels: Record<Channel, string> = {
  email: 'Email',
  telegram: 'Telegram',
  facebook: 'Facebook',
}

export default function SchedulePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningReminders, setRunningReminders] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [schedules, setSchedules] = useState<ShootSchedule[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [defaultAdvanceMinutes, setDefaultAdvanceMinutes] = useState(1440)
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [form, setForm] = useState<ScheduleForm>(() => createEmptyForm())

  const fetchData = async () => {
    setLoading(true)
    try {
      const [scheduleRes, projectRes, notifyRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch('/api/projects'),
        fetch('/api/notifications/settings'),
      ])

      const [scheduleData, projectData, notifyData] = await Promise.all([
        scheduleRes.json(),
        projectRes.json(),
        notifyRes.json().catch(() => ({})),
      ])

      if (!scheduleRes.ok) throw new Error(scheduleData.error || 'Không thể tải lịch show.')
      setSchedules(Array.isArray(scheduleData) ? scheduleData : [])
      setProjects(Array.isArray(projectData) ? projectData : [])
      setDefaultAdvanceMinutes(notifyData.config?.reminderDefaults?.advanceMinutes || 1440)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const monthDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth])
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ShootSchedule[]>()
    for (const schedule of schedules) {
      const key = dateKey(new Date(schedule.startAt))
      map.set(key, [...(map.get(key) || []), schedule])
    }
    return map
  }, [schedules])

  const upcomingSchedules = useMemo(
    () => schedules
      .filter(schedule => new Date(schedule.startAt).getTime() >= startOfDay(new Date()).getTime())
      .slice(0, 8),
    [schedules]
  )

  const dueReminderCount = useMemo(
    () => schedules.filter(schedule => {
      if (!schedule.reminderAt || schedule.reminderSentAt) return false
      if (schedule.status === 'COMPLETED' || schedule.status === 'CANCELLED') return false
      return new Date(schedule.reminderAt).getTime() <= Date.now()
    }).length,
    [schedules]
  )

  const openCreateDialog = () => {
    setForm(createEmptyForm(defaultAdvanceMinutes))
    setDialogOpen(true)
  }

  const openEditDialog = (schedule: ShootSchedule) => {
    setForm({
      id: schedule.id,
      title: schedule.title,
      projectId: schedule.projectId || '',
      clientName: schedule.clientName || schedule.project?.clientName || '',
      clientEmail: schedule.clientEmail || schedule.project?.clientEmail || '',
      location: schedule.location || '',
      notes: schedule.notes || '',
      startAt: toLocalInput(schedule.startAt),
      endAt: schedule.endAt ? toLocalInput(schedule.endAt) : '',
      reminderAt: schedule.reminderAt ? toLocalInput(schedule.reminderAt) : '',
      notificationChannels: schedule.notificationChannels?.length ? schedule.notificationChannels : ['email'],
      status: schedule.status,
    })
    setDialogOpen(true)
  }

  const selectProject = (projectId: string) => {
    if (projectId === 'none') {
      setForm(prev => ({ ...prev, projectId: '' }))
      return
    }

    const project = projects.find(item => item.id === projectId)
    setForm(prev => ({
      ...prev,
      projectId,
      title: project?.eventName || prev.title,
      clientName: project?.clientName || prev.clientName,
      clientEmail: project?.clientEmail || prev.clientEmail,
      startAt: project?.eventDate ? toLocalInput(project.eventDate) : prev.startAt,
      reminderAt: project?.eventDate ? toLocalInput(addMinutes(new Date(project.eventDate), -defaultAdvanceMinutes).toISOString()) : prev.reminderAt,
    }))
  }

  const toggleChannel = (channel: Channel, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      notificationChannels: checked
        ? Array.from(new Set([...prev.notificationChannels, channel]))
        : prev.notificationChannels.filter(item => item !== channel),
    }))
  }

  const submitSchedule = async () => {
    setSaving(true)
    try {
      const method = form.id ? 'PATCH' : 'POST'
      const url = form.id ? `/api/schedules/${form.id}` : '/api/schedules'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          projectId: form.projectId || null,
          startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
          endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
          reminderAt: form.reminderAt ? new Date(form.reminderAt).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không thể lưu lịch show.')
      toast.success(form.id ? 'Đã cập nhật lịch show.' : 'Đã thêm lịch show mới.')
      setDialogOpen(false)
      await fetchData()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const deleteSchedule = async (schedule: ShootSchedule) => {
    if (!window.confirm(`Xóa lịch "${schedule.title}"?`)) return
    const res = await fetch(`/api/schedules/${schedule.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Đã xóa lịch show.')
      await fetchData()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Không thể xóa lịch show.')
    }
  }

  const runDueReminders = async () => {
    setRunningReminders(true)
    try {
      const res = await fetch('/api/schedules/reminders/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không thể gửi nhắc lịch.')
      toast.success(`Đã xử lý ${data.processedCount} lịch, gửi thành công ${data.sentCount}.`)
      await fetchData()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setRunningReminders(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải lịch show...</div>
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Lịch show chụp</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý ngày chụp, trạng thái và nhắc lịch tới các kênh thông báo của studio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={runDueReminders} disabled={runningReminders} className="gap-2">
            {runningReminders ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
            Gửi nhắc đến hạn
            {dueReminderCount > 0 && <Badge className="ml-1">{dueReminderCount}</Badge>}
          </Button>
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Thêm lịch
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Tổng lịch" value={schedules.length} icon={<CalendarDays className="h-5 w-5 text-sky-600" />} />
        <Metric title="Sắp diễn ra" value={upcomingSchedules.length} icon={<Clock className="h-5 w-5 text-amber-600" />} />
        <Metric title="Cần gửi nhắc" value={dueReminderCount} icon={<BellRing className="h-5 w-5 text-emerald-600" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>{currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</CardTitle>
              <CardDescription>Lịch tháng và các show đã lên lịch.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <div key={day} className="py-2">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map(day => {
                const items = schedulesByDate.get(dateKey(day)) || []
                const inMonth = day.getMonth() === currentMonth.getMonth()
                const today = dateKey(day) === dateKey(new Date())
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      const base = createEmptyForm(defaultAdvanceMinutes)
                      setForm({ ...base, startAt: toLocalInput(day.toISOString()), reminderAt: toLocalInput(addMinutes(day, -defaultAdvanceMinutes).toISOString()) })
                      setDialogOpen(true)
                    }}
                    className={cn(
                      'min-h-24 rounded-lg border p-2 text-left transition-colors hover:bg-muted/50',
                      !inMonth && 'bg-muted/30 text-muted-foreground',
                      today && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="mb-2 text-xs font-semibold">{day.getDate()}</div>
                    <div className="space-y-1">
                      {items.slice(0, 3).map(item => (
                        <div key={item.id} className="truncate rounded bg-sky-500/10 px-2 py-1 text-[10px] font-medium text-sky-800">
                          {new Date(item.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {item.title}
                        </div>
                      ))}
                      {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} lịch</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Show sắp tới</CardTitle>
              <CardDescription>Ưu tiên theo thời gian gần nhất.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSchedules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Chưa có lịch show sắp tới.</div>
              ) : upcomingSchedules.map(schedule => (
                <ScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  onEdit={() => openEditDialog(schedule)}
                  onDelete={() => deleteSchedule(schedule)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="text-left">
            <DialogTitle>{form.id ? 'Cập nhật lịch show' : 'Thêm lịch show mới'}</DialogTitle>
            <DialogDescription>Thiết lập thời gian, khách hàng, nhắc lịch và kênh nhận thông báo.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Liên kết show chụp</Label>
              <Select value={form.projectId || 'none'} onValueChange={selectProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn show chụp có sẵn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không liên kết</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.eventName} - {project.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="schedule-title">Tên lịch</Label>
              <Input id="schedule-title" value={form.title} onChange={(event) => setForm(prev => ({ ...prev, title: event.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule-client">Tên khách</Label>
              <Input id="schedule-client" value={form.clientName} onChange={(event) => setForm(prev => ({ ...prev, clientName: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule-email">Email khách</Label>
              <Input id="schedule-email" value={form.clientEmail} onChange={(event) => setForm(prev => ({ ...prev, clientEmail: event.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule-start">Bắt đầu</Label>
              <Input id="schedule-start" type="datetime-local" value={form.startAt} onChange={(event) => setForm(prev => ({ ...prev, startAt: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="schedule-end">Kết thúc</Label>
              <Input id="schedule-end" type="datetime-local" value={form.endAt} onChange={(event) => setForm(prev => ({ ...prev, endAt: event.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedule-reminder">Thời điểm nhắc</Label>
              <Input id="schedule-reminder" type="datetime-local" value={form.reminderAt} onChange={(event) => setForm(prev => ({ ...prev, reminderAt: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Trạng thái</Label>
              <Select value={form.status} onValueChange={(value) => setForm(prev => ({ ...prev, status: value as ScheduleStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="schedule-location">Địa điểm</Label>
              <Input id="schedule-location" value={form.location} onChange={(event) => setForm(prev => ({ ...prev, location: event.target.value }))} />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label>Kênh nhận nhắc lịch</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(channelLabels) as Channel[]).map(channel => (
                  <label key={channel} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                    <Checkbox
                      checked={form.notificationChannels.includes(channel)}
                      onCheckedChange={(checked) => toggleChannel(channel, Boolean(checked))}
                    />
                    {channelLabels[channel]}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="schedule-notes">Ghi chú nội bộ</Label>
              <Textarea id="schedule-notes" value={form.notes} onChange={(event) => setForm(prev => ({ ...prev, notes: event.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Đóng</Button>
            <Button type="button" disabled={saving} onClick={submitSchedule} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {form.id ? 'Lưu lịch' : 'Thêm lịch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background p-4">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
      {icon}
    </div>
  )
}

function ScheduleRow({ schedule, onEdit, onDelete }: { schedule: ShootSchedule; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{schedule.title}</p>
            <Badge variant="outline" className={statusStyles[schedule.status]}>{statusLabels[schedule.status]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(schedule.startAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(schedule.clientName || schedule.location) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {schedule.clientName && <p>{schedule.clientName}</p>}
          {schedule.location && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {schedule.location}</p>}
        </div>
      )}

      {schedule.projectId && (
        <Link href={`/dashboard/projects/${schedule.projectId}`} className="text-xs font-medium text-primary hover:underline">
          Mở chi tiết show
        </Link>
      )}
    </div>
  )
}

function createEmptyForm(advanceMinutes = 1440): ScheduleForm {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  start.setHours(9, 0, 0, 0)
  const end = addMinutes(start, 120)
  const reminder = addMinutes(start, -advanceMinutes)

  return {
    title: '',
    projectId: '',
    clientName: '',
    clientEmail: '',
    location: '',
    notes: '',
    startAt: toLocalInput(start.toISOString()),
    endAt: toLocalInput(end.toISOString()),
    reminderAt: toLocalInput(reminder.toISOString()),
    notificationChannels: ['email'],
    status: 'PLANNED',
  }
}

function toLocalInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function buildMonthGrid(month: Date) {
  const first = startOfMonth(month)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}
