# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

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

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Build & Test

Frontend (Next.js):

```bash
# from workspace root
cd frontend
pnpm install
pnpm dev    # runs Next.js dev server
```

Backend (FastAPI - trannhatvi-ai):

```bash
cd trannhatvi-ai
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows Powershell
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tests:

```bash
cd trannhatvi-ai
pytest -q
```

## Architecture Overview

This repository implements a photo gallery + AI indexing and search system composed of:

- Frontend: Next.js React app at `frontend/` (client + server components). UI for galleries, admin, and project pages.
- Backend: FastAPI app at `trannhatvi-ai/` implementing AI analysis, embedding, indexing and vector search coordination.
- Database: Postgres (via Supabase) stores photo metadata, aiContext, and counts.
- Vector DB: Qdrant stores vectors in two logical indices: image vectors (primary + chunks) and face vectors.
- AI Engine: `app.services.ai_engine` provides text/clip/face embeddings and vision-language analysis.
- Checkpointing: `app.services.checkpointer` persists indexing job state for status/polling and safe resume.

Key design points:
- Deterministic UUIDs (uuid5) are used for Qdrant point IDs to avoid invalid IDs and ensure idempotent upserts.
- Each photo has a `primary` representative vector (is_primary=True) plus chunk vectors; semantic search queries primary set first (fast), then reranks candidate photos using chunk vectors (two-phase search).
- Background indexing is asynchronous and reportable via checkpoint state; single-photo enqueue endpoint exists for user-triggered indexing.

## Conventions & Patterns

- File locations:
   - Backend API routes: `trannhatvi-ai/app/api/endpoints.py`
   - Vector DB wrapper: `trannhatvi-ai/app/services/vector_db.py`
   - Background jobs: `trannhatvi-ai/app/services/background_jobs.py`
   - DB validators and helpers: `trannhatvi-ai/app/services/db_check.py`
   - AI engine: `trannhatvi-ai/app/services/ai_engine.py`
   - Checkpoint manager: `trannhatvi-ai/app/services/checkpointer.py`

- Qdrant usage:
   - Two collections: `image_index` and `face_index`.
   - Store `photo_id`, `project_id`, `is_primary` in payload for filtering.
   - Use deterministic UUID v5 for point IDs.

- API / Endpoints (important):
   - `POST /projects/{project_id}/photos/{photo_id}/context` — enqueue single-photo full pipeline (context + embeddings). Returns 202.
   - `GET /tasks/index/{project_id}` — read checkpointed index state for polling progress/status.
   - `GET /projects/{project_id}/assets` — fetch stored assets (normalizes JSON fields like `clip_embedding`).
   - `GET /admin/stats/global` and `GET /projects/{project_id}/stats` — admin/project stats now expose both unique images embedded and total vector points.
   - `POST /search/semantic` and `POST /search/face` — search endpoints used by frontend.

- Frontend integration:
   - `frontend/components/photo-card.tsx` now contains an "Embed AI" action which calls the single-photo enqueue endpoint and polls `GET /tasks/index/{project_id}` until completion, then refreshes gallery data.
   - Admin UI `frontend/app/dashboard/settings/page.tsx` displays `indexed_photos_qdrant_images` and `total_vectors_qdrant`.

Developer notes:
- When editing indexing / upsert logic, ensure point IDs are UUID strings; Qdrant rejects arbitrary strings.
- Keep chunk-level vectors (for rerank) and also upsert a primary representative per photo.
- Avoid redundant Cloudinary fetches if `aiContext` exists; allow embedding from stored `aiContext` where applicable.

Operational workflow:
- To trigger a full system sync use admin endpoints in the UI or `POST /sync/all` (background task).
- Single-photo flow is suitable for manual corrections or on-demand embedding.

Recent changes (summary):
- Deterministic point IDs (uuid5) to fix Qdrant 400 errors.
- Added primary representative vectors and two-phase (primary + chunk rerank) semantic search.
- Updated background jobs to count indexed photos (unique images) instead of chunk counts for admin stats.
- Add single-photo enqueue endpoint and a task-status endpoint; frontend updated to call them and refresh UI.

References:
- Admin settings UI: [frontend/app/dashboard/settings/page.tsx](frontend/app/dashboard/settings/page.tsx)
- Photo UI + enqueue: [frontend/components/photo-card.tsx](frontend/components/photo-card.tsx)
- Gallery: [frontend/components/client-gallery.tsx](frontend/components/client-gallery.tsx)
- Qdrant tuning doc: [docs/QDRANT_TUNING.md](docs/QDRANT_TUNING.md)

If you want, I can also append a troubleshooting checklist for common runtime errors (Qdrant ID errors, UnboundLocalError, DB count mismatches).

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Browse_and_Select_Photos_for_Customers** (2203 symbols, 4437 relationships, 134 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Browse_and_Select_Photos_for_Customers/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Browse_and_Select_Photos_for_Customers/clusters` | All functional areas |
| `gitnexus://repo/Browse_and_Select_Photos_for_Customers/processes` | All execution flows |
| `gitnexus://repo/Browse_and_Select_Photos_for_Customers/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
