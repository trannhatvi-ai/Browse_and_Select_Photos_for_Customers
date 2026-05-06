'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Shield, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UserItem {
  id: string
  name: string
  email: string
  username: string | null
  phone: string | null
  role: string
  createdAt: string
  _count: { projects: number }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('STUDIO')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        setUsers(await res.json())
      } else if (res.status === 403) {
        toast.error('Bạn không có quyền truy cập trang này')
      }
    } catch {
      toast.error('Lỗi kết nối')
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => {
    setEditingUser(null)
    setName('')
    setEmail('')
    setUsername('')
    setPhone('')
    setPassword('')
    setRole('STUDIO')
    setDialogOpen(true)
  }

  const openEdit = (user: UserItem) => {
    setEditingUser(user)
    setName(user.name)
    setEmail(user.email)
    setUsername(user.username || '')
    setPhone(user.phone || '')
    setPassword('')
    setRole(user.role)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name || !email || !username || !phone || (!editingUser && !password)) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }
    setSaving(true)

    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
    const method = editingUser ? 'PATCH' : 'POST'
    const body: any = { name, email, username, phone, role }
    if (password) body.password = password

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingUser ? 'Đã cập nhật!' : 'Đã tạo tài khoản!')
        setDialogOpen(false)
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Thao tác thất bại')
      }
    } catch {
      toast.error('Lỗi kết nối')
    }
    setSaving(false)
  }

  const handleDelete = async (user: UserItem) => {
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Đã xóa tài khoản!')
      fetchUsers()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Xóa thất bại')
    }
  }

  const roleBadge = (role: string) => {
    if (role === 'ADMIN') return <Badge className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20"><Shield className="mr-1 h-3 w-3" />Admin</Badge>
    if (role === 'STUDIO') return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20"><Camera className="mr-1 h-3 w-3" />Studio</Badge>
    return <Badge variant="secondary">{role}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
          <p className="text-sm text-muted-foreground mt-1">Thêm, sửa, xóa tài khoản và phân quyền</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Thêm người dùng
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              Chưa có người dùng nào
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="text-center">Dự án</TableHead>
                  <TableHead className="text-center">Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.phone}</TableCell>
                    <TableCell>{roleBadge(user.role)}</TableCell>
                    <TableCell className="text-center">{user._count.projects}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Cập nhật thông tin tài khoản' : 'Tạo tài khoản mới với vai trò và quyền hạn'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="u-name">Tên</Label>
              <Input id="u-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-username">Username</Label>
              <Input id="u-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="studio_a" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-phone">Số điện thoại</Label>
              <Input id="u-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901234567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-password">Mật khẩu {editingUser && <span className="text-xs text-muted-foreground">(để trống nếu không đổi)</span>}</Label>
              <Input id="u-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">
                    <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-red-500" /> Admin</span>
                  </SelectItem>
                  <SelectItem value="STUDIO">
                    <span className="flex items-center gap-2"><Camera className="h-3.5 w-3.5 text-blue-500" /> Chủ Studio</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</> : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Tài khoản {deleteTarget?.name} ({deleteTarget?.email}) sẽ bị xóa khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return
                await handleDelete(deleteTarget)
                setDeleteTarget(null)
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
