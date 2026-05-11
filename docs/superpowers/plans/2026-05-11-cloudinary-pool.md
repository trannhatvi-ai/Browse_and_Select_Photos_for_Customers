# Cloudinary Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-account Cloudinary pools for admins and studios, with automatic account selection and compatibility for old admin-hosted photos.

**Architecture:** Add a `CloudinaryAccount` model and optional photo ownership fields, then route all upload/delete/usage behavior through a focused helper layer. Keep legacy `Settings` credentials as fallback and backfill source so existing deployments and old projects continue to work.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, Cloudinary Node SDK, Jest/ts-jest.

---

### Task 1: Schema and Account Selection Helper

**Files:**
- Modify: `frontend/prisma/schema.prisma`
- Create: `frontend/lib/cloudinary-accounts.ts`
- Create: `frontend/lib/__tests__/cloudinary-accounts.test.ts`

- [ ] Add `CloudinaryAccount` model and `Photo.cloudinaryAccountId/cloudinaryCloudName` fields.
- [ ] Write tests for selecting studio private pool over admin, choosing most remaining storage, and resolving legacy photos by `previewUrl` cloud name.
- [ ] Implement helper functions for eligible upload accounts and photo owner account resolution.

### Task 2: Upload and Delete Routes

**Files:**
- Modify: `frontend/app/api/projects/[id]/photos/route.ts`
- Modify: `frontend/app/api/projects/[id]/photos/google-drive/route.ts`
- Modify: `frontend/app/api/projects/[id]/face-upload/route.ts`
- Modify: `frontend/app/api/projects/[id]/route.ts`

- [ ] Replace single credential lookup with pool account selection.
- [ ] Store selected account id/cloud name on new photos.
- [ ] Delete each photo using its owning account, preserving admin-hosted legacy photos.

### Task 3: Settings and Usage API

**Files:**
- Create: `frontend/app/api/settings/cloudinary/accounts/route.ts`
- Modify: `frontend/app/api/settings/cloudinary/test/route.ts`
- Modify: `frontend/app/api/cloudinary/usage/route.ts`
- Modify: `frontend/lib/cloudinary-settings.ts`
- Modify: `frontend/lib/cloudinary-usage-status.ts`

- [ ] Add CRUD-ish API for Cloudinary accounts.
- [ ] Sum pool usage for dashboard.
- [ ] Keep legacy settings validation compatible.

### Task 4: Settings UI

**Files:**
- Modify: `frontend/app/dashboard/settings/page.tsx`

- [ ] Replace single Cloudinary form with account list plus add/test/enable controls.
- [ ] Keep guide and warning copy compatible with multiple accounts.

### Task 5: Verification

**Files:**
- Test files above plus existing Cloudinary tests.

- [ ] Run focused Jest tests for Cloudinary helpers/settings/usage.
- [ ] Run `git diff --check`.
- [ ] Run GitNexus detect changes.
