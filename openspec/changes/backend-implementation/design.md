# Backend Implementation — Technical Design

## Architecture

**Stack**
- Runtime: Node.js + Next.js 16 (Route Handlers API)
- Database: PostgreSQL + Prisma ORM
- Storage: Local filesystem (development), S3-compatible (production)
- Auth: NextAuth.js (credentials provider cho admin)
- Email: Resend (transactional email API)
- Queue: Bull Queue (Redis) cho async email sending

**Database Schema (Prisma)**

```prisma
model User {
  id          String    @id @default(cuid())
  email       String    @unique
  name        String
  password    String?   // nullable cho client access via token
  role        Role      @default(STUDIO)
  projects    Project[]
  createdAt   DateTime  @default(now())
}

model Project {
  id              String     @id @default(cuid())
  clientName      String
  clientEmail     String
  eventName       String
  eventDate       DateTime
  deadline        DateTime
  maxSelections   Int        @default(50)
  status          ProjectStatus @default(UPLOADING)
  watermarkConfig Json?      // { opacity: number, logoUrl: string }
  accessToken     String     @unique
  accessPassword  String?
  createdBy       String
  createdByUser   User       @relation(fields: [createdBy], references: [id])
  photos          Photo[]
  selections      Selection[]
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

model Photo {
  id         String     @id @default(cuid())
  projectId  String
  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  filename   String
  originalUrl String    // S3/local path
  previewUrl String    // Watermarked URL
  width      Int
  height     Int
  size       Int       // bytes
  selected   Boolean   @default(false)
  comment    String?
  uploadedAt DateTime  @default(now())
}

model Selection {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  photoId   String
  photo     Photo    @relation(fields: [photoId], references: [id])
  comment   String?
  createdAt DateTime @default(now())
  @@unique([projectId, photoId])
}

enum Role {
  STUDIO
  CLIENT
}

enum ProjectStatus {
  UPLOADING   // Studio đang upload ảnh
  CHOOSING    // Client đang chọn ảnh
  DONE        // Selection submitted, hoàn thành
}
```

## API Routes Structure

```
app/api/
├── auth/
│   ├── login/          POST /api/auth/login
│   ├── logout/         POST /api/auth/logout
│   └── session/        GET  /api/auth/session
├── projects/
│   ├── GET             List projects
│   ├── POST            Create project
│   ├── [id]/
│   │   ├── GET         Get project detail
│   │   ├── PATCH       Update project
│   │   └── DELETE      Delete project
│   └── [id]/photos/
│       ├── POST        Upload photos (multipart)
│       ├── GET         List photos
│       └── [photoId]/
│           ├── DELETE  Delete photo
│           └── PATCH   Update selection/comment
├── gallery/
│   └── [token]/
│       ├── GET         Get project gallery (public, client access)
│       └── POST        Submit selections
└── email/
    └── send/           POST /api/email/send (internal)
```

## Key Implementation Decisions

### 1. Watermark Generation
- **Tool**: `sharp` (Node.js image processing)
- **Process**: Upload → original lưu vào storage → generate preview với watermark → lưu preview URL
- **Caching**: Preview URL bao gồm hash của config (opacity, logo) để cache busting

### 2. File Upload
- **Multipart**: Dùng `next-api-route` processing với `formidable` hoặc `multer`
- **Stream to storage**: Không lưu tạm trên server, stream trực tiếp tới S3/local
- **Progress**: Server-sent events hoặc polling endpoint

### 3. Authentication Flow
- **Studio admin**: NextAuth.js với credentials (email + password hashed bcrypt)
- **Client**: Stateless token trong URL (`/gallery/abc123?token=xyz`) — có expiry date
- **Session**: HTTP-only cookies cho admin, localStorage token cho client (optional)

### 4. Email Sending
- **Async queue**: Bull + Redis
- **Provider**: Resend (free tier đủ cho dev)
- **Templates**: React Email hoặc simple HTML strings

### 5. Frontend-Backend Integration
- **Frontend đã có**: App Router, types trong `lib/types.ts`
- **API responses**: Match TypeScript interfaces
- **Error handling**: HTTP status codes + JSON error messages

## File Structure (Backend)

```
frontend/
├── app/api/                    # Next.js API routes
├── lib/
│   ├── db.ts                  # Prisma client singleton
│   ├── storage.ts             # Storage abstraction (local/S3)
│   ├── watermark.ts           # Watermark generation logic
│   ├── email.ts               # Email queue + templates
│   └── auth.ts                # NextAuth config
├── prisma/
│   └── schema.prisma          # Database schema
└── .env                       # DATABASE_URL, S3 creds, etc.
```

## Deployment Considerations

- **Environment**: Vercel (serverless) hoặc self-hosted VPS
- **Database**: Neon (PostgreSQL serverless) hoặc Supabase
- **Storage**: Cloudflare R2 (S3-compatible, cheap) hoặc AWS S3
- **Redis**: Upstash Redis cho Bull queue

## Open Questions

1. **Client gallery URL structure**: `/gallery/:token` hay giữ nguyên `/` với token param?
2. **Watermark text**: Giữ "PROOFS" text + logo hay chỉ logo?
3. **Selection limit enforcement**: Client-side only hay server-side validation?
4. **File size limits**: Max per file? Total per project?
5. **Email queue**: Cần immediate send hay async acceptable?
