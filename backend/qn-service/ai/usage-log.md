# AI Usage Log — Question Service

This log documents AI assistance used for the Question Service only, in accordance with CS3219 Appendix 3: AI Usage Policy.

Policy alignment:
- Prohibited phases avoided: requirements elicitation; architecture/design decisions.
- Allowed phases used: implementation/boilerplate, debugging assistance, documentation.
- All outputs reviewed and edited by authors.

Quick checklist:
- [x] Requirements and architecture created without AI.
- [x] AI used only for implementation/debugging/refactoring/docs.
- [x] README includes project-level AI use summary (Question Service section).
- [x] Prompts and key outputs summarized below.
- [x] All AI outputs reviewed and verified by authors.

---

## 2025-11-10 10:20 (UTC)
Tool: OpenAI Codex CLI assistant (ChatGPT)

Prompt/Command (summary):
- “Add QuestionAttempt storage in Question Service (Mongo), POST /attempts endpoint with Bearer auth, and integrate into AppModule.”

Output Summary:
- Generated NestJS module/service/controller for attempts:
  - `src/attempts/attempts.module.ts`
  - `src/attempts/attempts.service.ts` (writes to `QuestionAttempts` collection)
  - `src/attempts/attempts.controller.ts` (POST `/attempts`)
- Updated `src/app.module.ts` to import `AttemptsModule`.

Action Taken: [x] Modified

Author Notes:
- Reviewed DTO shape and ensured `user_id` is derived from JWT (`sub`/`user_id`).
- Aligned collection name via env (`ATTEMPTS_COLLECTION_NAME`).
- Verified consistency with existing Mongo provider and Bearer auth guard.

---

## 2025-11-10 11:00 (UTC)
Tool: OpenAI Codex CLI assistant (ChatGPT)

Prompt/Command (summary):
- “Add GET /attempts to list the authenticated user’s attempts with pagination.”

Output Summary:
- Added `AttemptsService.listByUser(userId, { page, pageSize })`.
- Added `GET /attempts` in `attempts.controller.ts` using Bearer auth.

Action Taken: [x] Modified

Author Notes:
- Ensured sorting by `created_at` descending and total count in response.
- Chose defaults page=1, pageSize=20; capped pageSize at 100.

---

## 2025-11-10 11:40 (UTC)
Tool: OpenAI Codex CLI assistant (ChatGPT)

Prompt/Command (summary):
- “Extend question search to include topics and data-structure fields with partial, case-insensitive matching.”

Output Summary:
- Updated `questions.service.ts` search logic to include: `topic`, `category`, `related_topics` (string/array), `dataStructures` (string/array), and `tags` (string/array), in addition to `title` and `id` substring.

Action Taken: [x] Modified

Author Notes:
- Preserved existing topic filter semantics and sorting pipeline.
- Kept regex-based matching; mindful of index usage trade-offs (accepting for now given scope).

---

## 2025-11-10 12:10 (UTC)
Tool: OpenAI Codex CLI assistant (ChatGPT)

Prompt/Command (summary):
- “Add public health endpoint that pings MongoDB and update README.”

Output Summary:
- Added `src/health/health.controller.ts` exposing `GET /healthz` and `/health` (public).
- Added `src/health/health.module.ts` and imported into `AppModule`.
- Updated `README.md` with Health section and example response.

Action Taken: [x] Modified

Author Notes:
- Health route intentionally left unauthenticated for liveness probes.
- Returns `status: ok|degraded`, `mongo.status`, uptime, and timestamp.

---

## 2025-11-10 12:40 (UTC)
Tool: OpenAI Codex CLI assistant (ChatGPT)

Prompt/Command (summary):
- “Create a script to mass-populate attempts and document usage in README.”

Output Summary:
- Added `scripts/seed_attempts.js` (Node 18+, uses global fetch) to fetch questions and post randomized attempts for the authenticated user.
- README updates with usage instructions for bash/PowerShell/cmd and optional env vars.

Action Taken: [x] Modified

Author Notes:
- Script honors `QN_TOKEN`, `QN_BASE_URL`, and optional `COUNT`.
- Posts realistic timestamps within past 6 months; 70% completion ratio by default.

---

## Verification
- Static review of TypeScript/NestJS code for type alignment and provider wiring.
- Ensured env-driven collection names and consistent JWT field extraction.
- Health endpoint tested conceptually by `db.command({ ping: 1 })` call pattern.

## Notes on Licensing & Integrity
- No third-party code snippets copied verbatim; generated code authored for this project.
- All AI-generated outputs were reviewed, edited, and validated by the authors.

