# Question Service — Query Guide

This service exposes endpoints to search questions and record/fetch user question attempts, backed by MongoDB.

Base URL: `http://localhost:${PORT}` (defaults to `3000`)

Auth: Most routes require `Authorization: Bearer <JWT>` (guarded by `BearerAuthGuard`). The health endpoint is public.

## Health

GET `/healthz` (public)

- Returns basic liveness and Mongo connectivity.
- Response example:

```json
{
  "status": "ok",
  "uptime": 12.345,
  "service": "QuestionService",
  "mongo": { "status": "ok" },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Endpoints

GET `/questions`

- Returns a paginated list of questions with optional filtering, search, and sorting.
- Response shape: `{ items: QuestionWithPoints[], total: number, page: number, pageSize: number }`
- Each item includes a computed `points` field derived from `difficulty`.

Points mapping:
- `easy` → `1`
- `medium` → `3`
- `hard` → `5`

## Query Parameters

- `page` (number): Page number. Default `1`.
- `pageSize` (number): Items per page. Default `20`.
- `limit` (number): Legacy alias mapped to `pageSize` if provided.
- `topic` (string): Filter by a single topic. Matches either
  - comma-separated `related_topics` string, or
  - `related_topics` array.
  Case-insensitive exact token match (e.g., `Array` matches `Array, Two Pointers`).
- `difficulty` (string): One of `easy`, `medium`, `hard` (case-insensitive exact match).
- `q` (string): Search term applied as:
  - case-sensitive, partial match on `title`
  - partial, string-based match on numeric `id` (via `$toString`), e.g., `q=11` matches `11`, `110`, etc.
  Note: Does not search Mongo `_id`.
- `sortBy` (string): Sort field. Supported values (case-insensitive):
  - `title`, `topic`, `related_topics`, `difficulty`, `popularity`, `likes`,
    `discuss_count`, `solve_rate`, `solverate`, `acceptance_rate`, `frequency`, `rating`, `id`
- `sortDir` (string): `asc` (default) or `desc`.

Sorting details:
- Default sort is `title` ascending.
- Sorting by `difficulty` uses rank: Easy (1) < Medium (2) < Hard (3), then `title` asc as a tiebreaker.
- Other sorts use the chosen field then `title` asc as tiebreaker.

## Examples

Assume the service runs on `http://localhost:3000` and you have a valid JWT in `$TOKEN`.

List first page (20 items, default sort title asc):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions"
```

Top 5 (using `limit` alias):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?limit=5"
```

Search by title substring (case-sensitive):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?q=Container"
```

Search by numeric id substring (e.g., matches 11, 110, 211):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?q=11"
```

Filter by topic (matches token within comma list or array):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?topic=Two%20Pointers"
```

Filter by difficulty (case-insensitive):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?difficulty=Medium"
```

Sort by likes descending:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?sortBy=likes&sortDir=desc"
```

Paginate (page 3, 50 per page):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions?page=3&pageSize=50"
```

Difficulty rank sort (Easy → Medium → Hard):

```bash
curl -H "Authorization: Bearer $TOKEN" \
"http://localhost:3000/questions?sortBy=difficulty&sortDir=asc"
```

GET `/questions/:id`

- Returns a single question by exact numeric `id`.
- Response shape: `QuestionWithPoints`

Example:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions/11"
```

GET `/questions/:id`

- Returns a single question by exact numeric `id`.
- Response shape: `QuestionWithPoints`

Example:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/questions/11"
```

POST `/attempts`

- Records a question attempt.
- Body:

```json
{
  "question_id": "11",            // required (string or number)
  "status": "completed|left",     // optional, defaults to "left"
  "started_at": "ISO-8601",       // optional, defaults to now
  "submitted_at": "ISO-8601",     // optional, defaults to now
  "question": { /* snapshot */ }   // optional arbitrary question metadata
}
```

Response: the created document, including `user_id` from the JWT, and `created_at`.

GET `/attempts`

- Returns paginated attempts for the authenticated user.
- Query params: `page`, `pageSize` (defaults 1 and 20).
- Response: `{ items, total, page, pageSize }`.

## Behavior Notes

- Title search via `q` is case-sensitive and partial.
- Numeric `id` search via `q` is substring-based after stringifying the number.
- Exact-by-id is available at `/questions/:id` (numeric only); no Mongo `_id` lookup.
- Response always includes total count and the page/pageSize echoed back.

## Environment

The service reads Mongo settings from env vars (see `.env`):

- `MONGODB_URI` — connection string (required)
- `MONGODB_NAME` — database name (default: `QuestionService`)
- `MONGODB_COLLECTION` or `QUESTIONS_COLLECTION_NAME` — collection name (default: `Questions`)
- `PORT` — HTTP port (default: `3000`)
- `CORS_ORIGINS` — optional CSV of allowed origins

## Related Code

- Controller: `src/questions/questions.controller.ts`
- Service: `src/questions/questions.service.ts`
- Mongo provider: `src/mongodb/mongo.provider.ts`
- Attempts: `src/attempts/*`
- Health: `src/health/*`

## Seeding Attempts

You can mass-populate attempts for the authenticated user using the Node script:

Requirements: Node.js v18+

1) Set a valid JWT in `QN_TOKEN` (Supabase user access_token)

Windows CMD:
```
set QN_TOKEN=eyJ...
```

PowerShell:
```
$env:QN_TOKEN="eyJ..."
```

Bash:
```
export QN_TOKEN=eyJ...
```

Optional vars:
- `QN_BASE_URL` (default `http://localhost:3000`)
- `COUNT` number of attempts (default `50`)

Run:
```
node backend/qn-service/scripts/seed_attempts.js
```
or
```
node backend/qn-service/scripts/seed_attempts.js 100
```

The script fetches questions and posts randomized attempts (`completed` or `left`) with realistic timestamps within the past 6 months.
