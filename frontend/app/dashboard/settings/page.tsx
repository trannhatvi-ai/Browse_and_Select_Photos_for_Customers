import { Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Cài đặt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cấu hình tùy chọn studio của bạn
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Settings className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground">Cài đặt Studio</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tính năng cài đặt sẽ sớm ra mắt
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
