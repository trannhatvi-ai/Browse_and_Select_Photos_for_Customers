# File Storage

## Requirements

### REQ-STORAGE-001: Store Original Photos
- Lưu trữ file gốc (full resolution) từ studio upload
- Backup đơn giản (local filesystem hoặc S3-compatible)
- Không public access, chỉ server-side

### REQ-STORAGE-002: Serve Watermarked Previews
- Generate và cache watermarked versions
- Serve qua public URL (CDN nếu có)
- Optimized (compressed, resized max 1920px)

### REQ-STORAGE-003: Store Studio Logos
- Logo upload trong project creation
- Resize/optimize logo cho watermark
- Keep original logo file

### REQ-STORAGE-004: Delete Files
- Khi project xóa, xóa cả files (original + previews)
- Logo共享 giữa các project (nếu cùng studio)

## Scenarios

### Scenario A: Storage Backend Swap
Given hiện dùng local filesystem
When cần scale
Then có thể đổi sang S3 với minimal code changes (abstraction layer)

## Out of Scope
- Versioning của files
- CDN configuration (nâng cao)
- File recovery/undelete
- Storage quotas
