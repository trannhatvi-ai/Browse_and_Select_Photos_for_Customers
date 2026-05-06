'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Calendar, FolderOpen, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Lấy danh sách khách hàng từ dữ liệu dự án
    fetch('/api/projects')
      .then(res => res.json())
      .then(projects => {
        // Gom nhóm theo Email hoặc Tên khách hàng
        const clientMap = new Map()
        projects.forEach((p: any) => {
          if (!clientMap.has(p.clientEmail)) {
            clientMap.set(p.clientEmail, {
              name: p.clientName,
              email: p.clientEmail,
              projectCount: 0,
              lastProject: p.createdAt
            })
          }
          const client = clientMap.get(p.clientEmail)
          client.projectCount += 1
          if (new Date(p.createdAt) > new Date(client.lastProject)) {
            client.lastProject = p.createdAt
          }
        })
        setClients(Array.from(clientMap.values()))
      })
  }, [])

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Danh sách khách hàng</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm theo tên hoặc email..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Số dự án</TableHead>
                <TableHead>Gần nhất</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.email}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {client.name}
                  </TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{client.projectCount}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(client.lastProject).toLocaleDateString('vi-VN')}
                  </TableCell>
                </TableRow>
              ))}
              {filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Chưa có dữ liệu khách hàng.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
