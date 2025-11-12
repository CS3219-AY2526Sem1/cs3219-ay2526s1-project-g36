# AI Usage Log — Matching Service

This log documents AI assistance used for the Matching Service (and selected frontend interactions that directly integrate with it), in accordance with CS3219 Appendix 3: AI Usage Policy.

Policy alignment:
- Prohibited phases avoided: requirements elicitation; architecture/design decisions.
- Allowed phases used: implementation/boilerplate, debugging assistance, documentation.
- All outputs reviewed and edited by authors.

Quick checklist:
- [x] Requirements and architecture created without AI.
- [x] AI used only for implementation/debugging/refactoring/docs.
- [x] README includes project-level AI use summary (Matching Service section).
- [x] Prompts and key outputs summarized below.
- [x] All AI outputs reviewed and verified by authors.

---

## 2025-10-12
Tool: GitHub Copilot Chat (OpenAI)

Prompt/Command (verbatim):
- "I am tasked with creating a matching feature where I have to match 2 users based on criterias such as difficulty and topic. I would like difficulty to be prioritised first then topic, if both matches it would be ideal but if they dont then the order will be as such."

Output Summary:
- Generated a basic WebSocket-based matching gateway (NestJS + Socket.IO) that queues users by difficulty and attempts to pair by priority: same difficulty first, then topic; emits a `matched` event with a room id.

Action Taken: [x] Modified

Files Touched:
- `src/matching/matching.gateway.ts`
- `src/app.module.ts` (provider wiring)

Author Notes:
- Reviewed event names for compatibility; ensured immediate per-user matching after enqueue.

---

## 2025-10-12
Tool: GitHub Copilot Chat (OpenAI)

Prompt/Command (verbatim):
- "Generate a basic html test file where I can test if the matching feature works"

Output Summary:
- Produced a minimal HTML test client that connects to the `/matching` namespace via Socket.IO and supports connect, join-queue, and cancel actions with a simple log view.

Action Taken: [x] Modified

Files Touched:
- `test-client/index.html`

Author Notes:
- Verified Socket.IO v4 script and connection URL; ensured logs for `matched` and error states.

---

## 2025-11-08
Tool: GitHub Copilot Chat (OpenAI)

Prompt/Command (verbatim):
- "Add a disconnect and auto-disconnect function to my matching service to handle situations where the user leaves matchmaking or the user suddenly disconnects. Ensure that they are removed from the queue."

Output Summary:
- Implemented explicit cancel handling (`match:cancel`) and automatic removal `handleDisconnect`, ensuring queued users are removed by socket id; acknowledged removal via `left-queue`.

Action Taken: [x] Modified

Files Touched:
- `src/matching/matching.gateway.ts`

Author Notes:
- Added logging around disconnect/cancel paths and guarded against race conditions during removal.

---

## 2025-11-08 (Frontend scope)
Tool: GitHub Copilot Chat (OpenAI)

Prompt/Command (verbatim):
- "For frontend, add a loading popup for users that are currently waiting in queue to tell them that the matchmaking is in progress, previously there was no indicator so the user would not know if they are in queue. Also, add a leave matchmake button in the loading popup which will connect it to the matching-service disconnect function"

Output Summary:
- Added a simple modal with a spinning indicator while queued and a "Leave matchmaking" button wired to emit the service's cancel/disconnect action.

Action Taken: [x] Modified (Frontend repository)

Author Notes:
- Ensured the button triggers the same event path as `match:cancel` and disables join controls while active.

---

## 2025-11-11 (Frontend scope)
Tool: GitHub Copilot Chat (OpenAI)

Prompt/Command (verbatim):
- "Edit the ranking scoreboard under one of the tabs to pull user data from Supabase and populate the scoreboard with information pertaining to their username, number of problems solved and their rating (total points). The scoreboard will automatically update and rank the first 3 users in accordance to their rating."

Output Summary:
- Implemented Supabase-backed fetch for user leaderboard, computed top-3 by total points, and rendered username, solved count, and rating.

Action Taken: [x] Modified (Frontend repository)

Author Notes:
- Cached results briefly; ensured safe rendering during async load.

---

## 2025-11-11 (Frontend scope)
Tool: GitHub Copilot Chat (OpenAI)

Prompt/Command (verbatim):
- "Made UI changes by adding a loading icon when users are waiting for their room to be setup and another loading icon when users first click on the Ranking page as it waits for the server to fetch data from Supabase."

Output Summary:
- Added a queuing-state loading indicator for matchmaking; added a separate loading indicator for the Ranking tab until Supabase data resolves.

Action Taken: [x] Modified (Frontend repository)

Author Notes:
- Reused a shared spinner component for visual consistency.

---

## 2025-11-11 (Frontend scope)
Tool: GitHub Copilot Chat (OpenAI)

Prompt/Command (verbatim):
- "In the Collaboration room, I shifted the question to be at the top in the form of a dropdown component and left everything else the same."

Output Summary:
- Rearranged Collaboration room layout: moved question selector to a top dropdown; preserved existing editor and chat placement.

Action Taken: [x] Modified (Frontend repository)

Author Notes:
- Verified keyboard focus and no regression to editor layout.

---

## Verification
- Manual testing using `test-client/index.html`: two browsers join queue, receive `joined-queue`, then `matched` with a room id.
- Disconnect and cancel flows verified: user removal from queues and `left-queue` acknowledgement.
- Frontend prompts validated by UI behavior (loading indicators, leave button wiring, leaderboard rendering) in the associated frontend repository.

## Notes on Licensing & Integrity
- No third-party code snippets copied verbatim; generated code authored for this project.
- All AI-generated outputs were reviewed, edited, and validated by the authors.

