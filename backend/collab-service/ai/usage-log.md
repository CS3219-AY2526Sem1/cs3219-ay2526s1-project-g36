# AI Usage Log — Collaboration Service

This log documents AI assistance used for the Collaboration Service only, in accordance with CS3219 Appendix 3: AI Usage Policy.

Policy alignment:

- Prohibited phases avoided: requirements elicitation; architecture/design decisions.
- Allowed phases used: implementation/boilerplate, debugging assistance, documentation.
- All outputs reviewed and edited by authors.

Quick checklist:

- [x] Requirements and architecture created without AI.
- [x] AI used only for implementation/debugging/refactoring/docs.
- [x] README includes project-level AI use summary (Collaboration Service section).
- [x] Prompts and key outputs summarized below.
- [x] All AI outputs reviewed and verified by authors.

---

## 2025-10-31 21:00 (UTC)

Tool: ChatGPT (GPT-5)

Prompt/Command (summary):

- "I have JWT verification working but need to debug why Supabase tokens are failing validation. Review my auth service logic."

Output Summary:

- Identified configuration mismatch between JWKS and Supabase JWT secret approach.
- Suggested switching verification method to match Supabase token format.

Action Taken: [x] Modified

Author Notes:

- I had already implemented the auth service architecture and JWT flow.
- Applied suggested configuration fix to `src/auth/auth.service.ts`.
- Updated Docker Compose with correct SUPABASE_JWT_SECRET based on feedback.
- Verified the fix resolved token validation issues.
- Error handling and service structure were already in place.

---

## 2025-10-25 20:00 (UTC)

Tool: ChatGPT (GPT-5)

Prompt/Command (summary):

- "I've designed a persistence layer for my Yjs service: snapshot management with 30s interval triggers and 200 ops threshold, LevelDB key structure with snapshot:/update:/history: prefixes, pruning at 60s for updates, and change detection for history. Write the implementation code for collab.service.ts."

Output Summary:

- Wrote implementation code for the persistence layer based on provided specifications.
- Coded snapshot triggers, LevelDB operations, pruning logic, and history tracking functions.

Action Taken: [x] Modified

Author Notes:

- I had already architected the entire persistence strategy and key-value structure design.
- ChatGPT wrote the implementation code following my exact specifications.
- I reviewed the generated code for correctness and adherence to my architecture.
- Made minor adjustments to batch operation logic.
- Tested and validated all persistence functionality (snapshots, updates, history, revert).
- The Yjs integration patterns and session management were already implemented by me.

---

## 2025-10-24 23:00 (UTC)

Tool: ChatGPT (GPT-5)

Prompt/Command (summary):

- "I've architected burst buffering with TYPE_BURST_MS=1000ms and MAX_BURST_MS=5000ms timing, plus session state sync and revert functionality for my gateway. Write the code to add these features to my existing collab.gateway.ts."

Output Summary:

- Wrote burst buffering implementation code per specifications.
- Coded session state synchronization logic.
- Implemented history tracking and revert event handlers.

Action Taken: [x] Modified

Author Notes:

- I had already designed the burst buffering algorithm, timing parameters, and session management flow.
- ChatGPT wrote the implementation code for the features I specified.
- The WebSocket gateway structure, Socket.IO setup, and room-based architecture were already implemented by me.
- Reviewed generated code for correctness and integration with existing gateway.
- Added additional error handling and edge case validation beyond generated code.
- Tested all features with multiple concurrent users.

---

## 2025-11-08 23:00 (UTC)

Tool: ChatGPT (GPT-5)

Prompt/Command (summary):

- "I've designed a burst buffering algorithm: mergeRecords() combines edit records, flushBurst() persists/broadcasts aggregated changes, combineChanges() merges adjacent text ops, with typing pause detection. Write burst-manager.ts implementing these functions."

Output Summary:

- Wrote code for `mergeRecords()`, `flushBurst()`, and `combineChanges()` functions per specifications.
- Implemented timing logic for pause detection based on provided algorithm.

Action Taken: [x] Modified

Author Notes:

- I had already architected the burst buffering system and designed all function signatures.
- ChatGPT wrote the implementation code for the module based on my specifications.
- Reviewed generated code and refined merge logic for forward-typing edge cases.
- Extended delete handling beyond initial implementation.
- Thoroughly tested with multi-line paste and various text operations.
- Verified all timing triggers work as designed.

---

## 2025-11-08 23:30 (UTC)

Tool: ChatGPT (GPT-5)

Prompt/Command (summary):

- "I've designed history merging: combineChanges() for storage, mergeAdjacent() for single-char edits within 1.2s window (MERGE_WINDOW_MS), with edge case handling for insert/delete ops. Write history-combiner.ts implementing this."

Output Summary:

- Wrote code for `combineChanges()` and `mergeAdjacent()` functions per specifications.
- Implemented time-window merging logic and edge case handlers.

Action Taken: [x] Modified

Author Notes:

- I had already designed the history merging algorithm and time-window approach.
- ChatGPT wrote the implementation code following my specifications.
- Reviewed generated code and extended edge case handling for line boundaries and multi-line scenarios.
- Tested with interleaved edits from multiple users to validate chronological ordering.
- Added snippet truncation logic (MAX_SNIPPET_LENGTH=120).
- The merge window timing (1.2s) was my design decision based on typing speed research.

---

## Verification

- Static review of TypeScript/NestJS code for type alignment and WebSocket integration.
- Tested Yjs document synchronization with multiple concurrent clients.
- Validated LevelDB persistence: snapshot creation, update tracking, history storage.
- Verified burst buffering reduces history clutter without losing granularity.
- Tested revert functionality with various history states and edge cases.
- Confirmed JWT authentication flow with Supabase tokens.
- Load tested with rapid typing and multi-user concurrent editing scenarios.

## Notes on Licensing & Integrity

- All architecture, design decisions, algorithms, and specifications created by author without AI.
- AI was used only to write implementation code based on detailed author specifications.
- The author had already designed: persistence strategy, burst buffering algorithm, history merging logic, WebSocket architecture, and all timing parameters before using AI.
- All AI-generated code was reviewed, tested, and often extended by the author.
- Core service structure, Yjs integration, and Socket.IO setup implemented by author.
- Yjs and Socket.IO integration patterns adapted from official documentation.
- LevelDB usage patterns verified against classic-level documentation.
