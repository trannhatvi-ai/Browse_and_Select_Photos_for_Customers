# Backend Implementation — Proposal

## Problem Statement

Current frontend-only prototype relies on mock data. Studio cannot actually upload photos, clients cannot access real galleries. Need real backend with persistent storage.

## Solution Summary

Build complete backend API with:
- PostgreSQL database (Prisma ORM)
- File upload + watermark generation (Sharp + S3/local)
- Authentication (NextAuth for admin, token-based for clients)
- Email notifications (Resend)
- Full integration với existing frontend components

## Scope (Included)

- API routes trong `app/api/`
- Database schema + migrations
- File storage layer abstraction
- Watermark generation service
- Email queue + templates
- Frontend integration (replace mock data calls)
- Error handling + validation
- Basic rate limiting

## Out of Scope (Not Included)

- Multi-tenancy (single studio only)
- Advanced analytics dashboard
- Client password reset
- Mobile app
- Realtime notifications (WebSocket)
- Image editing tools (crop, rotate)
- Bulk operations on projects

## Approach Rationale

**Next.js API Routes** — Already using Next.js, no extra server needed. Easy deployment on Vercel.

**Prisma** — Type-safe DB access, excellent DX, migrations managed.

**Sharp** — Fast image processing in Node, watermark generation reliable.

**Resend** — Developer-friendly email API, free tier.

**Local storage first** — Simplifies dev; S3 adapter ready for production swap.

## Success Criteria

- Studio admin có thể tạo project, upload 100+ photos
- Client mở link, xem gallery, chọn ảnh, submit
- Watermarks hiển thị đúng opacity
- Emails gửi thành công trong <5s
- No data loss, uploads resumable (basic)
- Frontend loads data từ API thay vì mock

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| S3 costs nếu upload large | Medium | Medium | Start with local storage, S3 only in prod |
| Image processing slow | Low | High | Background queue + parallel processing |
| Email deliverability (spam) | Medium | Medium | Use Resend, setup proper domain auth |
| Concurrent uploads corrupt DB | Low | High | DB transactions + file locking |

## Timeline Estimate

- Phase 0 (Infra): 1 hour
- Phase 1 (Auth): 2 hours
- Phase 2 (Projects API): 2 hours
- Phase 3 (Photos/Watermark): 3 hours
- Phase 4 (Client Gallery): 2 hours
- Phase 5 (Email): 1.5 hours
- Phase 6 (Integration): 2 hours
- Phase 7 (Polish): 1.5 hours

**Total**: ~15 hours development + testing

## Dependencies

- PostgreSQL database accessible
- Redis (có thể dùng in-memory cho dev)
- Resend account (API key)
- Node.js 20+ (already)
- `sharp` binary có thể cần build tools (windows: prebuilt binaries)

## Open Questions

1. **Storage backend**: Local dev filesystem path? (`frontend/public/uploads` hay `../storage`?)
2. **Token expiry**: Client token hết hạn sau bao lâu? (30 días?)
3. **Rate limits**: Anonymous gallery endpoints có limit?
4. **Email sender**: From address? (`noreply@studio.com`)
5. **Project deletion**: Soft delete hay hard delete?

---

**Status**: Ready for review
**Created**: 2026-05-06
**Author**: AI Assistant with user
