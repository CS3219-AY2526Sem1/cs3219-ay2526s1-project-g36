# AI Usage Log — Frontend

This log documents AI assistance used for the **Frontend (Next.js + React + Tailwind + TypeScript)** of the CS3219 project, in accordance with **CS3219 Appendix 3: AI Usage Policy**.

**Policy alignment:**

* Prohibited phases avoided: requirements elicitation; architecture/design decisions.
* Allowed phases used: implementation/boilerplate, debugging assistance, documentation.
* All outputs reviewed and edited by authors.

**Quick checklist:**

* [x] Requirements and architecture created without AI.
* [x] AI used only for implementation/debugging/refactoring/docs.
* [x] README includes project-level AI use summary (Frontend section).
* [x] Prompts and key outputs summarized below.
* [x] All AI outputs reviewed and verified by authors.

---

## 2025-10-28

**Tool:** ChatGPT (OpenAI GPT-5)

**Prompt/Command (verbatim):**

> “Generate mock data and mock users for the frontend”

**Output Summary:**

* Generated mock datasets for `users` and `questions` to simulate backend API responses.
* Created reusable helper functions to fetch mock data locally (e.g., `getMockUsers()`, `getMockQuestions()`).
* Ensured mock objects matched the expected backend schema for smooth integration later.

**Action Taken:** [x] Modified

**Files Touched:**

* `data/mockUsers.ts`
* `data/mockQuestions.ts`
* `services/api.ts`

**Author Notes:**

* Used mock data to test page routing, UI states, and frontend logic before backend endpoints were implemented.
* This allowed frontend progress to continue independently, enabling early UI validation and reducing integration delays.

---

## 2025-11-02

**Tool:** ChatGPT (OpenAI GPT-5)

**Prompt/Command (verbatim):**

> “Add a Monaco Editor component to the collaboration room that supports syntax highlighting and auto-completion for multiple languages.”

**Output Summary:**

* Added Monaco Editor integration using `@monaco-editor/react`.
* Configured dynamic language switching via dropdown (`language` prop).
* Added initial Yjs binding placeholder for shared editing state.

**Action Taken:** [x] Modified

**Files Touched:**

* `components/MonacoEditor.tsx` (later changed to `components/MonacoCollabTextArea.tsx`)
* `pages/collab/[roomId].tsx`

**Author Notes:**

* Reviewed performance and verified lazy-loading of the Monaco package.
* Marked this as a “nice-to-have” feature in presentation slides for showcasing real-time syntax-aware editing.

---

## 2025-11-10

**Tool:** ChatGPT (OpenAI GPT-5)

**Prompt/Command (verbatim):**

> “My signup page password box is too small to include all password requirements as placeholders. How should I display the requirements instead?”

**Output Summary:**

* Suggested converting inline placeholder text into a collapsible “hint” box below the password input.
* Provided sample implementation using Tailwind and conditional rendering.

**Action Taken:** [x] Modified

**Files Touched:**

* `components/SignupForm.tsx`

**Author Notes:**

* Implemented hint toggle for better accessibility; revised colors and icons manually.

---

## Verification

* Frontend UI tested with active backend connections to confirm socket and REST integration.
* All UI changes verified on local Docker environment (`frontend:3000`).
* Monaco Editor syntax highlighting verified for JavaScript, Python, and C++.
* Leaderboard data verified via Supabase live fetch and sorting logic.

---

## Notes on Licensing & Integrity

* No third-party code copied verbatim; all generated code adapted for project context.
* All AI-generated code and text were **reviewed, edited, and validated by the author** before commit.
* This log covers **frontend-related AI usage** only; backend services are documented separately.

---
