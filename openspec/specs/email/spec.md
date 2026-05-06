# Email Notifications

## Requirements

### REQ-EMAIL-001: Send Project Invitation
When studio tạo project, gửi email cho client:
- Link truy cập gallery
- Project name, deadline
- Password nếu có

### REQ-EMAIL-002: Reminder Notifications
-自动发送 reminder X ngày trước deadline
- Studio có thể manual send reminder

### REQ-EMAIL-003: Selection Submitted
When client submit selection, gửi email thông báo cho studio.

## Scenarios

### Scenario A: Project Creation Email
Given admin create project with client email
When project saved thành công
Then background job queue email với link như sau: `https://studio.com/gallery/abc123?email=client@example.com`
If project có password, include password hint.

## Out of Scope
- Email templates customization
- Email analytics (open/click tracking)
- Bounce handling
- SMTP server management (dùng 3rd party: SendGrid, Resend, hoặc mailtrap dev)
