---
type: project
created: 2026-05-25
updated: 2026-09-30
---

# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.

## Supported AI platforms (AG Kit)
- AG Kit **only supports Gemini CLI and Google Antigravity**.
- Do not claim compatibility with Claude Code, Cursor, Copilot, Windsurf, or other assistants unless the user explicitly expands scope.
- Copy on the website, docs, FAQ, README, and marketing should describe AG Kit as a toolkit for Gemini CLI / Antigravity-style agent setups.

## Media & File Upload Standards (Supabase Storage)
- ALL media uploads (photos, audio recordings, videos, PDFs) across current and future modules (RDO, Leads CRM, Termografia, Comissionamento, Ativos, Fotovoltaico, Mobilidade Elétrica) MUST use the central `/api/upload` endpoint.
- `/api/upload` stores files directly in Supabase Storage (`cordeiro-media` bucket) with public access and high-speed CDN delivery.
- Never store raw Base64 strings directly in PostgreSQL unless as an emergency fallback when cloud storage is completely unreachable.
