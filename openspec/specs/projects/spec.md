# Project Management API

## Requirements

### REQ-PROJ-001: Create Project
Studio admin tạo project mới với thông tin:
- Client name, email
- Event name, date
- Max selections, deadline
- Watermark config (logo, opacity)
- Upload photos (multiple)

### REQ-PROJ-002: List Projects
Danh sách tất cả projects với filter và sort:
- Status: uploading/choosing/done
- Sort by date, client name
- Pagination (optional)

### REQ-PROJ-003: View Project Detail
Xem chi tiết project:
- Client info
- Photo list (with selection/comment status)
- Selection statistics
- Watermarked preview

### REQ-PROJ-004: Update Project Status
Studio có thể update status thủ công (manual override).

## Scenarios

### Scenario A: Create Project Flow
Given admin ở dashboard
When click "New Project"
Then show form với tất cả fields
When fill all required + upload photos
When click "Save & Send Link"
Then project created, photos lưu vào storage
Then email gửi link cho client (async)

### Scenario B: Project List Filtering
Given admin xem projects table
When filter by status "Choosing"
Then chỉ hiển thị projects đang trong trạng thái client chọn ảnh

## Out of Scope
- Project editing sau khi tạo (chỉ view + status change)
- Soft delete (hard delete only)
- Project templates
- Bulk operations
