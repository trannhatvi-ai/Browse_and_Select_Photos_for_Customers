'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, Eye, EyeOff, Loader2, Mail, MessageCircle, Save, Send, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type Channel = 'email' | 'telegram' | 'facebook'

type NotificationConfig = {
  email: { enabled: boolean; address: string }
  telegram: { enabled: boolean; chatId: string }
  facebook: { enabled: boolean; pageAccessToken: string; recipientId: string }
  reminderDefaults: { advanceMinutes: number }
}

const defaultConfig: NotificationConfig = {
  email: { enabled: true, address: '' },
  telegram: { enabled: false, chatId: '' },
  facebook: { enabled: false, pageAccessToken: '', recipientId: '' },
  reminderDefaults: { advanceMinutes: 1440 },
}

const channelLabels: Record<Channel, string> = {
  email: 'Email',
  telegram: 'Telegram',
  facebook: 'Facebook',
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [config, setConfig] = useState<NotificationConfig>(defaultConfig)
  const [logs, setLogs] = useState<any[]>([])

  const enabledChannels = useMemo(
    () => (Object.keys(channelLabels) as Channel[]).filter(channel => config[channel].enabled),
    [config]
  )

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/settings')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không thể tải cấu hình thông báo.')
      setConfig({ ...defaultConfig, ...data.config })
      setLogs(Array.isArray(data.logs) ? data.logs : [])
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSettings()
  }, [])

  const updateChannel = (channel: Channel, patch: Record<string, string | boolean>) => {
    setConfig(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        ...patch,
      },
    }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không thể lưu cấu hình thông báo.')
      setConfig(data.config)
      toast.success('Đã lưu cấu hình thông báo.')
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const testNotifications = async () => {
    if (enabledChannels.length === 0) {
      toast.error('Hãy bật ít nhất một kênh thông báo trước khi test.')
      return
    }

    setTesting(true)
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: enabledChannels }),
      })
      const data = await res.json()
      if (!res.ok) {
        const firstError = data.results?.find((result: any) => result.error)?.error
        throw new Error(firstError || 'Chưa gửi được thông báo thử.')
      }
      toast.success(`Đã gửi thử ${data.sentCount} kênh thông báo.`)
      await fetchSettings()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải cấu hình thông báo...</div>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Thông báo Studio</h1>
          <p className="text-sm text-muted-foreground">
            Cấu hình nơi nhận nhắc lịch, cảnh báo và các thông tin vận hành quan trọng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={testNotifications} disabled={testing || saving} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Test thông báo
          </Button>
          <Button onClick={saveSettings} disabled={saving || testing} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu cấu hình
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-sky-600" />
                  Email
                </CardTitle>
                <CardDescription>Gửi nhắc lịch vào email của chủ studio hoặc email vận hành.</CardDescription>
              </div>
              <Switch checked={config.email.enabled} onCheckedChange={(enabled) => updateChannel('email', { enabled })} />
            </CardHeader>
            <CardContent className="grid gap-2">
              <Label htmlFor="notify-email">Email nhận thông báo</Label>
              <Input
                id="notify-email"
                type="email"
                value={config.email.address}
                onChange={(event) => updateChannel('email', { address: event.target.value })}
                placeholder="studio@example.com"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-600" />
                  Telegram
                </CardTitle>
                <CardDescription>Gửi qua bot Studio Pro. Nhập Chat ID của người nhận thông báo.</CardDescription>
              </div>
              <Switch checked={config.telegram.enabled} onCheckedChange={(enabled) => updateChannel('telegram', { enabled })} />
            </CardHeader>
            <CardContent className="grid gap-2">
              <Label htmlFor="telegram-chatid">Telegram Chat ID</Label>
              <Input
                id="telegram-chatid"
                value={config.telegram.chatId}
                onChange={(event) => updateChannel('telegram', { chatId: event.target.value })}
                placeholder="Nhập Chat ID hoặc Telegram User ID"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  Facebook
                </CardTitle>
                <CardDescription>Gửi qua Messenger API bằng Page Access Token và Recipient ID.</CardDescription>
              </div>
              <Switch checked={config.facebook.enabled} onCheckedChange={(enabled) => updateChannel('facebook', { enabled })} />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="facebook-token">Page Access Token</Label>
                <Input
                  id="facebook-token"
                  type={showSecrets ? 'text' : 'password'}
                  value={config.facebook.pageAccessToken}
                  onChange={(event) => updateChannel('facebook', { pageAccessToken: event.target.value })}
                  placeholder="EAAG..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="facebook-recipient">Recipient ID</Label>
                <Input
                  id="facebook-recipient"
                  value={config.facebook.recipientId}
                  onChange={(event) => updateChannel('facebook', { recipientId: event.target.value })}
                  placeholder="PSID nhận tin"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                Nhắc lịch mặc định
              </CardTitle>
              <CardDescription>Áp dụng khi tạo lịch show mới.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="advance-minutes">Báo trước bao nhiêu phút</Label>
                <Input
                  id="advance-minutes"
                  type="number"
                  min={5}
                  value={config.reminderDefaults.advanceMinutes}
                  onChange={(event) => setConfig(prev => ({
                    ...prev,
                    reminderDefaults: {
                      advanceMinutes: Number(event.target.value) || 1440,
                    },
                  }))}
                />
              </div>
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setShowSecrets(value => !value)}>
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSecrets ? 'Ẩn token Facebook' : 'Hiện token Facebook'}
              </Button>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                Kênh đang bật: {enabledChannels.length ? enabledChannels.map(channel => channelLabels[channel]).join(', ') : 'chưa có kênh nào'}.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lịch sử gửi gần đây</CardTitle>
              <CardDescription>20 thông báo mới nhất của studio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Chưa có thông báo nào được gửi.</div>
              ) : logs.map(log => (
                <div key={log.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-xs">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{channelLabels[log.channel as Channel] || log.channel}</Badge>
                      <span className="truncate font-medium">{log.subject || 'Thông báo'}</span>
                    </div>
                    {log.error && <p className="line-clamp-2 text-red-600">{log.error}</p>}
                    <p className="text-muted-foreground">{new Date(log.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  {log.status === 'sent' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
