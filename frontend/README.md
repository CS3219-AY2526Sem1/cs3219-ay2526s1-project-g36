# PeerPrep Frontend

The **PeerPrep Frontend** is a modern web interface built with **Next.js**, **TypeScript**, and **Tailwind CSS**.  
It serves as the main entry point for users, handling authentication, matchmaking, and real-time collaboration by integrating with the backend microservices.

# Table of Contents

- [Overview](#peerprep-frontend)
- [Architecture Overview](#architecture-overview)
- [Key Responsibilities](#key-responsibilities)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Development Notes](#development-notes)
- [Testing / Linting](#testing-linting)
- [Related Services](#related-services)

## Architecture Overview

The frontend is designed using the **Next.js App Router** and follows a modular structure for scalability and maintainability.  
It interacts with backend services (Matching, Collaboration, Question, and User) via RESTful APIs and WebSocket connections.

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        UI[React Components] --> Router[App Router (/app)]
        Router --> Pages[Pages & Layouts]
        Pages --> API[Axios / Supabase Client]
        API --> Services[Backend APIs]
    end

    subgraph "Backend Microservices"
        Matching[Matching Service (Port 3001)]
        Collab[Collab Service (Port 3002)]
        Question[Question Service (Port 3000)]
        User[User Service (Port 4001)]
    end

    Services --> Matching
    Services --> Collab
    Services --> Question
    Services --> User

    subgraph "External"
        Supabase[(Supabase Auth & Database)]
    end

    UI --> Supabase
    Services --> Supabase
```

## Key Responsibilities ##
- Provides a user-friendly interface for coding and collaboration
- Manages authentication and session persistence with Supabase
- Connects to backend services for matching, collaboration, and question management
- Enables real-time collaboration using WebSocket-based communication with the Collab Service

## Tech Stack ##
| Component            | Technology              | Version |
| -------------------- | ----------------------- | ------- |
| **Framework**        | Next.js                 | 14+     |
| **UI Library**       | React                   | 18+     |
| **Language**         | TypeScript              | ^5.0.0  |
| **Styling**          | Tailwind CSS            | ^3.3.0  |
| **Authentication**   | Supabase JS             | ^2.39.0 |
| **Linting / Format** | ESLint + Prettier       | —       |
| **Package Manager**  | npm / yarn / pnpm / bun | —       |

## Project Structure ##

The frontend of this project is built with **Next.js (App Router)**, **TypeScript**, and **React Context** for state management.  
It follows a modular structure to keep components, hooks, and utilities well-organized and easy to maintain.

```bash
frontend/
├── .env                      # Environment variables (e.g. API URLs, keys)
├── Dockerfile                # Docker configuration for containerizing the app
├── docker-compose.yml        # Used to run with other microservices
├── next.config.ts            # Next.js configuration
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── eslint.config.mjs         # ESLint rules for linting and code style
├── postcss.config.mjs        # PostCSS config (e.g., Tailwind CSS)
│
├── src/                      # Main application source code
│   ├── app/                  # Next.js App Router directory
│   │   ├── layout.tsx        # Root layout (applied across all pages)
│   │   ├── page.tsx          # Landing ("/") page
│   │   ├── components/       # Reusable UI components
│   │   ├── history/          # User history page
│   │   ├── login/            # Login page
│   │   ├── problems/         # Coding problem view
│   │   ├── profile/          # User profile page
│   │   ├── ranking/          # Leaderboard page
│   │   ├── room/             # Collaboration/matching room page
│   │   └── signup/           # Signup page
│   │
│   ├── styles/               # Global and modular CSS styles
│   └── themes/               # Theme configuration (dark/light)
│       ├── dark.ts
│       └── light.ts
│
├── context/                  # React Context for global state (e.g., theme)
│   └── ThemeContext.tsx
│
├── hooks/                    # Custom React hooks
│   ├── useCollaborativeDoc.ts # Real-time collaboration logic
│   └── useMatching.ts         # Handles matchmaking sockets
│
├── lib/                      # API utilities and helper functions
│   ├── auth.ts               # Authentication helpers
│   ├── backend.ts            # Backend API configuration
│   ├── matchingSocket.ts     # WebSocket client for matchmaking
│   ├── mockApi.ts            # Mock API for local development
│   ├── qn.ts                 # Question-related API
│   └── useRequireAuth.ts     # Page guard for protected routes
│
├── data/                     # Mock JSON data for development
│   ├── mockQuestions.json
│   └── mockUsers.json
│
├── utils/                    # Utility modules and configurations
│   └── supabase/             # Supabase client and server setup
│       ├── client.ts
│       └── server.ts
│
├── types/                    # Shared TypeScript types and interfaces
│   ├── routes.d.ts
│   └── validator.ts
│
├── public/                   # Static assets (images, icons, etc.)
│
└── .next/                    # Build output (auto-generated, excluded from Git)
```
## Environment Variables ##
Create a new file named .env in the `frontend/` directory.
This file stores environment variables needed to connect to Supabase.

```bash
# public anon key of supabase instance
NEXT_PUBLIC_SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"

# public url of supabase instance
NEXT_PUBLIC_SUPABASE_URL = "YOUR_PUBLIC_SUPABASE_URL"

# URL of the collaboration service
NEXT_PUBLIC_COLLAB_WS_URL=http://localhost:3002/collab

# URL of the matching service
NEXT_PUBLIC_MATCHING_SERVICE_URL=http://localhost:3001/matching

# URL of question service
NEXT_PUBLIC_QN_SERVICE_URL=http://qn:3000/questions
```

## Getting Started ##
### Prerequisites ###

Make sure you have the following installed:

- **Node.js** ≥ 18
- **npm**, **yarn**, **pnpm**, or **bun**

### Installation ###

Clone the repository and install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```
## Running the Development Server ##
Navigate to `frontend` directory and start the local dev server with the following command
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
By default, the app runs on http://localhost:4000 on your browser. If you want to change the port number, update this line
```json
"dev": "next dev --port 4000 --turbopack"
```
located at `package.json`.

## Development Notes ##
- **Hot Reloading:**  
  The app supports Next.js fast refresh for real-time updates during development.  
  Simply run `npm run dev` and your changes will reflect immediately in the browser.

- **Dockerized Setup:**  
  For a full-stack experience, run the entire system (frontend + backend microservices) via Docker Compose:
  ```bash
  docker-compose up --build

## Testing/ Linting ##

### Testing ###
Unit and integration testing are recommended to maintain code reliability and prevent regressions.

Install testing dependencies:
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```
Run all tests:
```bash
npm run test
```

Example addition to your `package.json`:
```json
"scripts": {
  "test": "jest"
}
```

### Linting ###
The project enforces consistent code style using **ESLint** and **Prettier**.

Run lint checks:
```bash
npm run lint
```
Automatically fix issues:
``` bash
npm run lint -- --fix
```
Ensure all TypeScript definitions are valid before committing:
``` bash
npm run type-check
```

## Related Services ##
The PeerPrep project is composed of several backend microservices that the frontend depends on.
Each service runs independently and communicates over HTTP or WebSocket connections through a shared Docker network.
| Service                                      | Description                                                             | Port   | Repository Path     |
| -------------------------------------------- | ----------------------------------------------------------------------- | ------ | ------------------- |
| **Question Service (`qn-service`)**          | Provides coding problems, difficulty levels, and problem metadata.      | `3000` | `/qn-service`       |
| **Matching Service (`matching-service`)**    | Handles matchmaking between users for collaborative sessions.           | `3001` | `/matching-service` |
| **Collaboration Service (`collab-service`)** | Manages real-time code editing and communication between matched users. | `3002` | `/collab-service`   |
| **User Service (`user-service`)**            | Manages user data, profiles, and history of collaboration sessions.     | `4001` | `/user-service`     |

> [!NOTE]
> All services are connected through the shared Docker network peerprep-net.
> When running locally, access them at http://localhost:<port>.
> When running in Docker, use their service names (e.g., http://matching-service:3001).