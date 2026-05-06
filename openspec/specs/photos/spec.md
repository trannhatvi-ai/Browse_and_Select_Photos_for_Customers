# Photo Upload & Management

## Requirements

### REQ-PHOTO-001: Upload Photos (Studio)
- Multiple file upload (drag & drop)
- Progress indication per file
- Server-side validation: file type (images only), size limit (max 50MB per file)
- Convert to optimized preview format (WebP/JPEG 85%)

### REQ-PHOTO-002: Generate Watermark
- Apply studio logo watermark lên preview images
- Opacity controlled by project setting (10-80%)
- Position: centered, rotated -30 degrees, text "PROOFS" cũng giữ lại
- Watermarked images served qua CDN hoặc local storage

### REQ-PHOTO-003: List Photos (Client Gallery)
- Paginated/scrollable grid
- Filter: all / selected / unselected
- Sort: date (desc) or filename (asc)
- Lazy loading với skeleton placeholders

### REQ-PHOTO-004: Get Photo Detail
- Single photo endpoint cho lightbox
- Returns: src (watermarked), metadata (filename, date, dimensions)

### REQ-PHOTO-005: Delete Photo (Studio)
- Studio có thể xóa photo khỏi project
- Xóa cả file vật lý trong storage

## Scenarios

### Scenario A: Uploading Large Batch
Given admin upload 100 ảnh
When upload hoàn tất
Then tất cả ảnh có preview watermarked
When một ảnh fail
Then show error, admin có thể retry riêng file đó

### Scenario B: Watermarking
Given project có watermark opacity 40%
When client xem gallery
Then tất cả preview images hiển thị watermark với opacity đó
When opacity đổi
Then regenerate watermarked images

## Out of Scope
- Face detection/grouping
- AI tagging
- Original high-res download (chỉ watermarked preview)
- EXIF data stripping (optional future)
