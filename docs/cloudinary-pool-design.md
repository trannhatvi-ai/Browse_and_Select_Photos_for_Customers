# Cloudinary Pool Design

Date: 2026-05-11

## Goal

Allow each admin or studio to add multiple Cloudinary accounts and use their combined storage automatically. If a studio has at least one enabled Cloudinary account, new uploads must use only that studio pool. If a studio has no private Cloudinary account, new uploads may use the admin shared pool when sharing is allowed.

Existing projects and photos must keep working even if they were uploaded before the studio configured private Cloudinary accounts.

## Current State

The app currently stores one Cloudinary credential set on `Settings`:

- `cloudinaryCloudName`
- `cloudinaryApiKey`
- `cloudinaryApiSecret`

Upload, Google Drive import, face upload, project deletion, photo deletion, and usage dashboard all assume one credential set per user, with fallback to admin credentials for studios without their own settings.

## Data Model

Add a `CloudinaryAccount` model:

- `id`
- `userId`
- `label`
- `cloudName`
- `apiKey`
- `apiSecret`
- `enabled`
- `usedBytes`
- `limitBytes`
- `lastCheckedAt`
- timestamps

Add optional photo ownership fields:

- `Photo.cloudinaryAccountId`
- `Photo.cloudinaryCloudName`

Keep legacy `Settings` Cloudinary fields for backward compatibility. The migration creates one `CloudinaryAccount` for every complete legacy credential set, and runtime fallback still reads legacy settings/env credentials for old deployments that have not been migrated yet.

## Selection Rules

For new uploads:

1. If project owner has at least one enabled private account, use only owner accounts.
2. Otherwise, if owner is a studio and admin sharing is allowed, use enabled admin accounts.
3. Otherwise, fail with the existing Cloudinary setup guidance.
4. Pick the enabled account with the most remaining storage: `limitBytes - usedBytes`.
5. If usage cannot be fetched, keep the account eligible but rank it after accounts with fresh usage.
6. If upload fails due to quota or Cloudinary account error, retry with the next eligible account.

For existing photos:

1. Prefer `Photo.cloudinaryAccountId` when present.
2. Otherwise infer `cloudinaryCloudName` from `previewUrl`.
3. Match that cloud name against the project owner's accounts, then admin accounts, then legacy settings/env credentials.
4. This preserves old photos that live in the admin Cloudinary account after a studio later adds private accounts.

## Upload Flow

Create a helper module responsible for account resolution:

- `getCloudinaryAccountsForUser(userId)`
- `getUploadCloudinaryAccountForProject(projectId)`
- `getCloudinaryAccountForPhoto(photo)`
- `getCloudinaryUsageForPool(userId)`
- `validateUserCloudinarySettings(userId)`
- `validateExistingProjectCloudinarySettings(userId)`

Update these routes to use the helper:

- `POST /api/projects/[id]/photos`
- `POST /api/projects/[id]/photos/google-drive`
- `POST /api/projects/[id]/face-upload`

When creating a photo, store the selected account id and cloud name on the photo record.

## Delete Flow

Photo and project deletion must delete each photo using the account that owns it. Project deletion should group photos by account to reduce repeated Cloudinary config changes.

If a legacy photo cannot be matched to an account, the DB deletion should continue but Cloudinary cleanup should log a warning.

## Usage Dashboard

Dashboard usage should show pool totals:

- total used bytes across eligible accounts
- total limit bytes across eligible accounts
- per-account status for future UI
- fallback to DB estimate if all Cloudinary API calls fail

Admin dashboard uses the admin pool. Studio dashboard uses the studio pool when configured, otherwise uses the admin shared pool if allowed.

## Settings UI

Replace the single Cloudinary form with an account list:

- add account
- edit label and credentials
- test connection
- enable or disable account
- show used, limit, remaining, and last checked
- show combined pool total

Legacy single settings can still be displayed as one existing account after migration.

## Migration

Add a Prisma migration:

1. Create `CloudinaryAccount`.
2. Add optional fields to `Photo`.
3. Backfill one `CloudinaryAccount` per user from existing complete `Settings` Cloudinary fields.
4. Backfill `Photo.cloudinaryCloudName` from `previewUrl` where possible.
5. Do not move or re-upload existing Cloudinary assets.

## Tests

Add focused tests for:

- choosing the account with most remaining storage
- studio private pool overrides admin shared pool for new uploads
- studio without private pool can use admin shared pool
- old admin-hosted photos are still resolved from `previewUrl`
- deletion groups photos by owning account
- usage totals sum multiple Cloudinary accounts
- network timeout falls back to database estimate without noisy errors

## Rollout Notes

This feature changes storage ownership, so implementation should be incremental:

1. Schema and helper layer.
2. Upload paths.
3. Delete paths.
4. Usage dashboard.
5. Settings UI.
6. Migration/backfill verification.

The app must remain compatible with photos created before this feature.
