# AGENTS.md - Photo Proofing Studio

## Development Methodology

This project follows a rigorous quality-first workflow combining three open-source tools:

### OpenSpec (Spec-Driven Development)
All features are planned in `openspec/` before implementation. The source of truth lives in `openspec/specs/` (requirements). Changes are proposed in `openspec/changes/` with proposal, design, and task breakdowns.

**Workflow**: propose → specs → design → tasks → implement → archive

See `openspec/project.md` for project-level spec.
Review active changes in `openspec/changes/`.

### Superpowers (Quality Enforcement)
Every development task follows the 7-step Superpowers protocol:
1. **Brainstorm** — explore design alternatives, get approval
2. **Isolate** — use git worktree to protect main branch
3. **Plan** — write atomic tasks (2-5 min each) with exact file paths and code
4. **Execute** — implement via subagents or batch with two-stage review
5. **Test** — Test-Driven Development (RED → GREEN → REFACTOR)
6. **Review** — two-stage: spec compliance, then code quality
7. **Complete** — verify tests pass, merge, clean up

**Core principles**:
- TDD mandatory: failing test before any production code
- YAGNI: build only what's required, no speculative abstractions
- Evidence over claims: actual test output, not assumptions

### Beads (Task Tracking)
Issue tracker designed for AI agents. Tasks are represented as beads in a dependency graph.

**Essential commands**:
```bash
bd ready              # List ready-to-work tasks
bd show <id>          # View task details
bd update <id> --claim  # Claim a task
bd close <id>         # Mark task complete
```

All work must be tracked in Beads. No ad-hoc tasks. See `CLAUDE.md` for Beads plugin instructions.

---

## Project Overview

A web application for photography studios that allows clients to browse, review, and select their favorite photos from photo sessions. The system has two main user roles:

- **Client**: Browse photos in a gallery, select favorites (heart), add retouching notes (comment), view full-screen lightbox, and submit selections.
- **Studio Admin**: Manage photo proofing projects, create new projects, upload photos, configure watermarks, view statistics, and manage clients.

## Tech Stack

### Frontend (`frontend/`)
- **Framework**: Next.js 16 (App Router, RSC)
- **Language**: TypeScript (strict mode, ES6 target)
- **React**: React 19
- **Styling**: Tailwind CSS 4 + `tw-animate-css`
- **UI Components**: shadcn/ui (new-york style) - `@/components/ui/`
- **Icons**: Lucide React
- **Form**: React Hook Form + Zod (resolvers available)
- **Package Manager**: pnpm
- **State**: React useState/useMemo (no external state library yet)
- **Theme**: `next-themes` with dark/light mode support
- **Analytics**: `@vercel/analytics` (production only)

### Key Libraries
| Library | Purpose |
|---------|---------|
| `@radix-ui/*` | Headless UI primitives (shadcn/ui foundation) |
| `class-variance-authority` | Component variant styling |
| `clsx` + `tailwind-merge` | Conditional class merging via `cn()` utility |
| `date-fns` | Date formatting |
| `react-day-picker` | Date picker |
| `recharts` | Charts (available, not yet used) |
| `sonner` | Toast notifications |
| `zod` | Schema validation |
| `embla-carousel-react` | Carousel |
| `vaul` | Drawer component |
| `cmdk` | Command palette |
| `react-resizable-panels` | Resizable panel layouts |

## Project Structure

```
Browse_and_Select_Photos_for_Customers/
├── AGENTS.md                      # This file
├── prompt_frontend.md             # v0 prompt instructions
├── prompt_frontend_full.md        # Full v0 prompts
└── frontend/                      # Next.js application
    ├── app/
    │   ├── layout.tsx             # Root layout (Geist font, Analytics)
    │   ├── page.tsx               # Client gallery page (/)
    │   ├── globals.css            # Tailwind + CSS variables (oklch colors)
    │   └── dashboard/
    │       ├── layout.tsx         # Dashboard layout (sidebar + main)
    │       ├── page.tsx           # Dashboard home (stats + projects table)
    │       ├── new-project/
    │       │   └── page.tsx       # Create new project form
    │       ├── projects/
    │       │   └── page.tsx       # All projects list
    │       ├── clients/
    │       │   └── page.tsx       # Clients page (placeholder)
    │       └── settings/
    │           └── page.tsx       # Settings page (placeholder)
├── components/
│   ├── client-gallery.tsx     # Main client gallery (filter, sort, grid, footer, comparison)
│   ├── photo-card.tsx         # Individual photo card (watermark, heart, comment)
│   ├── lightbox.tsx           # Full-screen photo viewer with navigation
│   ├── comment-modal.tsx      # Retouching notes modal
│   ├── comparison-viewer.tsx  # Side-by-side photo comparison tool
│   ├── dashboard-sidebar.tsx  # Dashboard sidebar navigation
│   ├── new-project-form.tsx   # New project creation form with upload
│   ├── projects-table.tsx     # Projects table with status badges
│   ├── stats-cards.tsx        # Dashboard statistics cards
│   ├── theme-provider.tsx     # Theme provider wrapper
│   └── ui/                    # shadcn/ui components (57 components)
├── hooks/
│   ├── use-mobile.ts          # Mobile breakpoint detection hook
│   └── use-toast.ts           # Toast state management hook
├── lib/
│   ├── types.ts               # TypeScript interfaces (Photo, Project, StatsData)
│   ├── mock-data.ts           # Mock data for photos, projects, stats
│   └── utils.ts               # cn() utility for class merging
├── styles/
│   └── globals.css            # Fallback/default CSS theme (shadcn/ui neutral)
    ├── package.json
    ├── tsconfig.json
    ├── next.config.mjs
    ├── postcss.config.mjs
    ├── components.json            # shadcn/ui configuration
    └── .gitignore
```

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Client Gallery | Photo browsing, selection, and submission |
| `/dashboard` | Dashboard Home | Stats overview + recent projects table |
| `/dashboard/new-project` | New Project | Create project + upload photos form |
| `/dashboard/projects` | All Projects | Full projects list with management |
| `/dashboard/clients` | Clients | Client management (placeholder) |
| `/dashboard/settings` | Settings | Studio settings (placeholder) |

## Core Components

### ClientGallery (`components/client-gallery.tsx`)
Main gallery page component. Manages photo state, filtering (`all`/`selected`/`unselected`), sorting (`date`/`filename`), lightbox, comment modal, and comparison viewer. Uses `mockPhotos` from `lib/mock-data.ts`. Max selection limit: 15. UI text in Vietnamese.

### PhotoCard (`components/photo-card.tsx`)
Individual photo card with "PROOFS" diagonal watermark overlay. Shows heart + comment icons on hover/tap. Supports selection toggle and comment trigger. Uses lazy image loading with skeleton placeholder.

### Lightbox (`components/lightbox.tsx`)
Full-screen photo viewer with keyboard navigation (Escape, ArrowLeft, ArrowRight). Shows watermark, filename, photo counter, and action buttons (heart/comment).

### CommentModal (`components/comment-modal.tsx`)
Modal for adding retouching notes to a specific photo. Includes photo preview and textarea input. Keyboard accessible (Escape to close).

### ComparisonViewer (`components/comparison-viewer.tsx`)
Side-by-side photo comparison tool. Allows selecting two photos to compare simultaneously with independent navigation. Supports keyboard controls (Tab to switch sides, arrows to navigate). Shows watermarks and action buttons (heart/comment).

### NewProjectForm (`components/new-project-form.tsx`)
Form for creating a new proofing project. Sections: Client Info, Project Details, Selection Settings, Watermark Setup, Photo Upload (drag & drop with simulated progress).

### ProjectsTable (`components/projects-table.tsx`)
Table displaying projects with status badges (uploading/choosing/done), action buttons (View, Edit, Send Reminder, Download, Delete).

## Data Types (`lib/types.ts`)

```typescript
interface Photo {
  id: string
  src: string
  filename: string
  date: string
  selected: boolean
  comment?: string
}

interface Project {
  id: string
  clientName: string
  clientEmail: string
  eventName: string
  eventDate: string
  status: 'uploading' | 'choosing' | 'done'
  deadline: string
  photoCount: number
  selectedCount: number
  maxSelections: number
}

interface StatsData {
  totalProjects: number
  pendingReview: number
  completed: number
  storageUsed: string
}
```

## Design System

### Color Palette (CSS Variables via oklch)
- **Primary**: Near-black (`oklch(0.18 0 0)`) - dark mode: near-white
- **Accent**: Coral/red (`oklch(0.65 0.2 15)`) - used for selection hearts, badges
- **Sidebar**: Dark background (`oklch(0.15 0 0)`) with light text
- **Background**: Near-white (`oklch(0.99 0 0)`) - dark mode: near-black
- **Muted**: Light gray-blue tint

### Typography
- **Sans**: Geist (Google Fonts)
- **Mono**: Geist Mono

### Component Style
- shadcn/ui `new-york` style with `neutral` base color
- CSS variables enabled, no Tailwind prefix
- Border radius: `0.5rem`

## Current State & Limitations

- **Frontend**: Complete. Client gallery, dashboard, new project form, all using mock data.
- **Mock Data**: `lib/mock-data.ts` với Picsum placeholder images.
- **No Backend Yet**: API routes, database, auth đang **pending** — có OpenSpec plan trong `openspec/changes/backend-implementation/`.
- **No Real Upload**: `new-project-form.tsx` dùng simulated progress.
- **Placeholder Pages**: Clients and Settings chưa implement.
- **State Management**: Component-level `useState` only.
- **Localization**: UI text đang tiếng Việt (partial, có thể cần hoàn thiện).

## OpenSpec Changes

**Active**: `openspec/changes/backend-implementation/`
- Backend API implementation (Auth, Projects, Photos, Storage, Email)
- See `tasks.md` for detailed checklist
- Tracked as Beads issue: `Browse_and_Select_Photos_for_Customers-9lr`

## Commands

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.**

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create Beads issues for anything that needs follow-up (`bd create` or update existing)
2. **Run quality gates** - Tests, linters, builds (if code changed)
3. **Update Beads status** - Close finished tasks, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches, remove temp files
6. **Verify** - All changes committed AND pushed, Beads DB synced
7. **Hand off** - Provide context for next session (what was done, next ready tasks from `bd ready`)

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing — that leaves work stranded locally
- NEVER say "ready to push when you are" — YOU must push
- If push fails, resolve and retry until it succeeds
- ALL tasks must be tracked in Beads; no off-the-books work

**Superpowers Reminder:**
- Every feature begins with a failing test (RED)
- Build minimal code to pass (GREEN)
- Refactor safely (REFACTOR)
- Apply YAGNI: build only what the spec requires
- Provide evidence: show actual test output, not claims
<!-- END BEADS INTEGRATION -->
