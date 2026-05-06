import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Khách hàng</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý thông tin liên hệ khách hàng
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground">Quản lý khách hàng</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tính năng quản lý khách hàng sẽ sớm ra mắt
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
