## Matching Service

Real-time Socket.IO matching for pairing users by difficulty, topics, and experience points. This service exposes a WebSocket namespace that accepts join/cancel events, maintains in-memory queues, and emits deterministic matches.

### Highlights

- WebSocket namespace: `/matching` (Socket.IO)
- Queues per difficulty: `easy`, `medium`, `hard`
- Priority matching strategy combining difficulty, topic overlap, wait time, and points proximity
- Immediate per-user matching plus periodic batch matching
- Optional Supabase integration to fetch user `total_points`
- Simple test client included at `test-client/index.html`

This service is WebSocket-first; there are no HTTP API endpoints exposed for matching.

## Architecture

- Technology: Node.js, NestJS WebSockets (Socket.IO)
- Entry point: `src/main.ts` listening on port `3000` with CORS enabled
- Gateway: `src/matching/matching.gateway.ts`
  - Maintains three in-memory queues keyed by difficulty
  - Subscribes to client events and emits updates/matches
  - Periodically runs a batch matcher on a timer (configurable)

Data is stored in-memory. For multi-instance deployments, introduce a shared store (e.g., Redis) and a Socket.IO adapter.

## Client Events and Payloads

Connect to the namespace at `ws(s)://<host>:3000/matching` using Socket.IO.

- Event: `join-queue`
  - Payload: `{ userId: string; difficulty: 'easy'|'medium'|'hard'; topics: string[] }`
  - Effect: User is enqueued and an immediate matching attempt runs.
  - Ack event: `joined-queue` → `{ ok: boolean; difficulty: string; position?: number }`

- Event: `match:cancel`
  - Effect: Removes the caller from any queue.
  - Ack event: `left-queue` → `{ ok: boolean }`

- Event: `get-queue`
  - Effect: Sends a snapshot of all queues.
  - Ack event: `queue-snapshot` → `{ easy: User[]; medium: User[]; hard: User[] }`
  - Note: Snapshot is for observability/testing; it includes socketIds.

- Server push: `matched`
  - Payload: `{ roomId: string; matchedUserId: string; matchedUserPoints?: number; yourPoints?: number }`

## Matching Algorithm

Each enqueued user has `{ userId, topics: string[], difficulty, totalPoints?, socketId, enqueuedAt }`.

Scoring tuple (lexicographically smaller is better):

1) difficulty distance (0 if same; higher means further apart)
2) negative number of common topics (more overlap is better)
3) negative total wait time (older pairs are favored)

Per-user matching attempt (runs immediately on enqueue):

1) Same difficulty with at least one common topic.
2) Same difficulty ignoring topics.
3) Points-based across queues when both users have `totalPoints` and the absolute difference is within `POINTS_TOLERANCE` (±10 by default). Prefer same difficulty, then others.
4) Brute-force after `BRUTE_FORCE_AFTER_MS` (default 5 minutes): consider all candidates across difficulties using the scoring tuple.

If a match is found, both users are atomically removed and each receives `matched` with a generated `roomId`.

Periodic batch matching: every `BATCH_INTERVAL_MS` (default 5000ms), the service scans all queues and greedily forms pairs using the same scoring tuple. This complements the per-user matching to reduce long waits.

## Supabase Integration (optional)

If `SUPABASE_URL` and `SUPABASE_KEY` are set, the service fetches `profiles.total_points` for the joining `userId`. Failures default to `0` to keep matching functional. If these variables are not set, points-based matching still runs with users treated as `0`.

## Configuration

- Port: fixed to `3000` (see `src/main.ts`)
- Environment variables:
  - `SUPABASE_URL` (optional)
  - `SUPABASE_KEY` (optional)
  - `BATCH_INTERVAL_MS` (optional, default `5000`)
- Tunable constants (in code `matching.gateway.ts`):
  - `POINTS_TOLERANCE` (default `10`)
  - `BRUTE_FORCE_AFTER_MS` (default `300000`)

## Run locally

From this folder (`backend/matching-service`):

```powershell
npm install
npm run start:dev
```

Then open the test client in a browser:

1) Open `test-client/index.html` directly in a browser.
2) Enter a user ID, pick a difficulty, add topics (e.g., `array,dp`).
3) Open a second tab/window and repeat with a different user ID but overlapping topics.
4) Click Connect → Find Match on both tabs. You should see a `matched` event with a room ID.

## Docker

Build and run the container (listens on port 3000):

```powershell
docker build -t matching-service .
docker run --rm -p 3000:3000 `
  -e BATCH_INTERVAL_MS=5000 `
  -e SUPABASE_URL=$Env:SUPABASE_URL `
  -e SUPABASE_KEY=$Env:SUPABASE_KEY `
  matching-service
```

## Scaling and Reliability

- Single instance: In-memory queues are sufficient.
- Multiple instances: Use a shared queue (e.g., Redis) and a Socket.IO Redis adapter to synchronize events across nodes. The project already depends on `ioredis`; wiring can be added as a next step.
- Persistence: Current queues aren’t persisted across restarts.

## Security Notes

- This service trusts the `userId` provided by the client for matching and, if configured, Supabase lookups. Integrate upstream authentication (e.g., JWT) and pass a verified user ID, or validate tokens in the gateway.
- CORS is enabled for all origins; tighten this in production.

## Project Structure

- `src/main.ts` – bootstrap; enables CORS; listens on port 3000
- `src/app.module.ts` – registers the matching gateway
- `src/matching/matching.gateway.ts` – core matching logic and Socket.IO events
- `test-client/index.html` – simple in-browser tester for the WebSocket API
- `Dockerfile` – multi-stage build producing a small runtime image

## Troubleshooting

- No match events: Ensure both clients connect to the correct namespace URL (e.g., `http://localhost:3000/matching`) and share compatible difficulty/topics.
- Cross-origin errors: The server has CORS enabled; verify your client URL and that you’re using Socket.IO, not plain WebSocket.
- Supabase errors in logs: The service falls back to `0` points; provide valid `SUPABASE_*` to enable points-based matching.

---

© PeerPrep Matching Service. All rights reserved.
