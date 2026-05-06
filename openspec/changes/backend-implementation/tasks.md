# Backend Implementation — Tasks

## Phase 0: Infrastructure Setup

- [ ] 0.1 Install dependencies: `pnpm add prisma @prisma/client next-auth bcryptjs bull ioredis sharp resend @aws-sdk/client-s3`
- [ ] 0.2 Setup environment variables in `.env.example`
- [ ] 0.3 Initialize Prisma: `npx prisma init --datasource-provider postgresql`
- [ ] 0.4 Configure `prisma/schema.prisma` từ design document
- [ ] 0.5 Create database (local: `npx prisma db push`; production: migrate)
- [ ] 0.6 Setup storage abstraction: `lib/storage.ts` với LocalStorageAdapter (base) và S3Adapter
- [ ] 0.7 `lib/utils/watermark.ts` — hàm apply watermark với sharp
- [ ] 0.8 Configure NextAuth trong `app/api/auth/[...nextauth]/route.ts`

## Phase 1: Authentication

- [ ] 1.1 Create User model trong Prisma + migrate
- [ ] 1.2 Implement admin registration endpoint (seeding initial admin)
- [ ] 1.3 Implement login endpoint (`POST /api/auth/login`) với credentials
- [ ] 1.4 Implement logout endpoint (`POST /api/auth/logout`)
- [ ] 1.5 Implement session check endpoint (`GET /api/auth/session`)
- [ ] 1.6 Add auth middleware cho dashboard routes
- [ ] 1.7 Write tests: auth flows (login success, login fail, session validation)

## Phase 2: Project Management API

- [ ] 2.1 Create Project, Photo, Selection models trong Prisma + migrate
- [ ] 2.2 Implement `GET /api/projects` — list với filter status
- [ ] 2.3 Implement `POST /api/projects` — create với all fields
- [ ] 2.4 Implement `GET /api/projects/[id]` — detail view
- [ ] 2.5 Implement `DELETE /api/projects/[id]` — soft/hard delete
- [ ] 2.6 Write tests: CRUD operations, validation (required fields)

## Phase 3: Photo Upload & Watermark

- [ ] 3.1 Setup storage adapter (local): configure upload directory
- [ ] 3.2 Implement `POST /api/projects/[id]/photos` — multipart upload
- [ ] 3.3 Stream file to storage + DB record tạo simultaneously
- [ ] 3.4 Implement watermark generation async (background job)
- [ ] 3.5 `GET /api/projects/[id]/photos` — list photos cho project (preview URLs)
- [ ] 3.6 Implement `DELETE /api/projects/[id]/photos/[photoId]`
- [ ] 3.7 Write tests: upload flow, watermark applied, deletion cascades

## Phase 4: Client Gallery & Selection

- [ ] 4.1 Implementation generate access token cho project (`/api/projects/[id]/token`)
- [ ] 4.2 Public endpoint `GET /api/gallery/[token]` — returns project + photos (no auth)
- [ ] 4.3 Public endpoint `POST /api/gallery/[token]/select` — submit selections
- [ ] 4.4 Server-side validation: max selections, already submitted
- [ ] 4.5 Update selection status khi client submit
- [ ] 4.6 Write tests: gallery access, selection submission, validation errors

## Phase 5: Email Integration

- [ ] 5.1 Setup Bull Queue + Redis (hoặc in-memory cho dev)
- [ ] 5.2 Configure Resend API key
- [ ] 5.3 Create email templates: project invitation, reminder, selection submitted
- [ ] 5.4 Implement `POST /api/email/send` internal endpoint
- [ ] 5.5 Queue email trong project creation flow
- [ ] 5.6 Background worker processing email queue
- [ ] 5.7 Write tests: email queued, sent, error handling

## Phase 6: Frontend-Backend Integration

- [ ] 6.1 Replace `mockPhotos` trong client-gallery.tsx với `fetch('/api/gallery/...')`
- [ ] 6.2 Update NewProjectForm: submit form data + files to `POST /api/projects`
- [ ] 6.3 Show upload progress từ API response
- [ ] 6.4 Update ProjectsTable: fetch từ `/api/projects`
- [ ] 6.5 Handle errors globally (toast notifications)
- [ ] 6.6 Write E2E tests (optional, nếu có time)

## Phase 7: Polish & Edge Cases

- [ ] 7.1 Pagination cho large photo lists (1000+)
- [ ] 7.2 Rate limiting trên API endpoints
- [ ] 7.3 File size validation (reject >50MB)
- [ ] 7.4 Retry logic cho failed uploads
- [ ] 7.5 Watermark regeneration khi opacity change
- [ ] 7.6 Audit logs (who did what)
- [ ] 7.7 Cleanup orphaned files khi project delete

## Acceptance Criteria

- ✅ All CRUD operations work for projects, photos
- ✅ Client can access gallery without login, via unique token
- ✅ Selection limit enforced server-side
- ✅ Watermarked previews generated automatically
- ✅ Emails sent asynchronously, reliable delivery
- ✅ No data loss on upload interruption
- ✅ Frontend fully functional với real API
