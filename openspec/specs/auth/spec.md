# Authentication & Authorization

## Requirements

### REQ-AUTH-001: Studio Admin Authentication
- Studioadmin đăng nhập để truy cập dashboard
- Session management với JWT hoặc NextAuth
- Protected routes cho `/dashboard/*`

### REQ-AUTH-002: Client Access Control
- Client truy cập gallery qua unique link
- Optional password protection
- No registration required cho client

## Scenarios

### Scenario A: Studio Admin Login
Given admin chưa đăng nhập
When truy cập `/dashboard`
Then redirect sang trang login
When nhập đúng credentials
Then redirect về dashboard với session hợp lệ
When logout
Then session bị xóa, redirect về login page

### Scenario B: Client Gallery Access
Given client nhận link từ studio
When mở link (e.g., `/gallery/abc123` or just `/` với token)
Then xem được gallery của project đó
When project có password
Then nhập password trước khi xem
When password sai
Then show error, không cho xem

## Out of Scope
- Multi-factor authentication
- OAuth/social login
- Role-based permissions (chỉ 2 roles: admin và client)
- Password reset flow
