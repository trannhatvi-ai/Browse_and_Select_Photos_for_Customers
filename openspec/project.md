# Photo Proofing Studio — Project Specification

## System Overview

A web application for photography studios that allows clients to browse, review, and select their favorite photos from photo sessions.

### User Roles

**Client**
- Browse photos in a gallery (grid view)
- Select favorites (heart icon, max limit per project)
- Add retouching notes/comments per photo
- View full-screen lightbox with navigation
- Compare two photos side-by-side
- Submit selections to studio

**Studio Admin**
- Dashboard with project statistics
- Create new proofing projects
- Upload photos (drag & drop)
- Configure watermark (studio logo, opacity)
- Set selection limits and deadlines
- View all projects, statuses
- Manage clients (placeholder)

## Current Implementation

### Frontend (Complete)
- Next.js 16 App Router + React 19
- TypeScript strict mode
- Tailwind CSS 4 + shadcn/ui (new-york, neutral)
- Client Gallery (`/`) - full-featured with mock data
- Dashboard with sidebar, stats, projects table
- New Project form with upload simulation
- Components: PhotoCard, Lightbox, CommentModal, ComparisonViewer
- Maximum selections: 15 photos per project
- UI localized in Vietnamese

### Data (Mock)
- `lib/mock-data.ts`: 24 photos, 5 projects, stats
- Types: Photo, Project, StatsData in `lib/types.ts`
- Picsum placeholder images

### Missing: Backend
No API routes, database, authentication, or real file storage.

## Technical Constraints

- Frontend: Next.js 16, React 19, TypeScript 5.7
- Styling: Tailwind CSS 4, shadcn/ui components
- Icons: Lucide React
- Package manager: pnpm
- No backend yet — ready for implementation

## Quality Standards

All implementation must follow Superpowers methodology:
- TDD (test before implementation)
- YAGNI (no speculative code)
- Evidence-based verification
- Two-stage code review (spec compliance + quality)
- Git worktree isolation for changes
