[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/QUdQy4ix)

# CS3219 Project (PeerPrep) - AY2526S1

## Group: G36

PeerPrep is a full-stack collaborative coding platform that pairs users for real-time technical interview practice. Built with Next.js and NestJS microservices, it features intelligent peer matching, live code editing with CRDTs, and a comprehensive question bank.

---

## Table of Contents

-   [Monorepo Layout](#monorepo-layout)
-   [System Architecture](#system-architecture)
-   [Services Overview](#services-overview)
-   [Quick Start (Docker Compose)](#quick-start-docker-compose)
-   [Verify Deployment](#verify-deployment)
-   [Environment Variables](#environment-variables)
-   [Local Development (without Docker)](#local-development-without-docker)
-   [Documentation Links](#documentation-links)
-   [Troubleshooting](#troubleshooting)
-   [Team](#team)
-   [License](#license)

---

## Monorepo Layout

```
cs3219-ay2526s1-project-g36/
├── frontend/                    # Next.js application
│   ├── src/app/                 # Next.js 15 app router
│   ├── hooks/                   # React hooks (useMatching, useCollaborativeDoc)
│   ├── lib/                     # API clients, auth utilities
│   ├── context/                 # React context providers
│   ├── Dockerfile
│   └── package.json
│
├── backend/
│   ├── qn-service/              # Question Service (NestJS + MongoDB)
│   │   ├── src/
│   │   │   ├── questions/       # Question CRUD, search, filters
│   │   │   ├── attempts/        # User attempt tracking
│   │   │   ├── auth/            # Bearer JWT guard (HS256)
│   │   │   └── mongodb/         # MongoDB provider
│   │   ├── scripts/
│   │   │   └── seed_attempts.js # Seed script for test data
│   │   └── Dockerfile
│   │
│   ├── user-service/            # User Service (NestJS + Prisma + PostgreSQL)
│   │   ├── src/
│   │   │   ├── auth/            # JWT verification (JWKS/Supabase)
│   │   │   ├── profile/         # User profile CRUD
│   │   │   ├── prisma/          # Prisma ORM integration
│   │   │   └── questions/       # (Optional) Question proxy
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Database schema
│   │   └── Dockerfile
│   │
│   ├── matching-service/        # Matching Service (NestJS + Socket.IO)
│   │   ├── src/
│   │   │   └── matching/
│   │   │       └── matching.gateway.ts  # WebSocket matching logic
│   │   ├── test-client/
│   │   │   └── index.html       # Browser-based test client
│   │   └── Dockerfile
│   │
│   ├── collab-service/          # Collaboration Service (NestJS + Yjs + Socket.IO)
│   │   ├── src/
│   │   │   ├── collab/
│   │   │   │   ├── collab.gateway.ts    # Socket.IO gateway
│   │   │   │   ├── collab.service.ts    # Yjs document management
│   │   │   │   ├── burst-manager.ts     # Edit batching
│   │   │   │   └── history-combiner.ts  # History merging
│   │   │   └── auth/            # JWT verification
│   │   ├── test-client/
│   │   │   └── index.html       # Browser-based test client
│   │   └── Dockerfile
│   │
│   └── collab-level-db/         # LevelDB persistence (mounted volume)
│
├── docker-compose.yml           # Root orchestration (all services)
├── LICENSE                      # MIT License
└── README.md                    # This file
```

---

## System Architecture

### High-Level Component Diagram

```mermaid
flowchart TB
    FE[Frontend - Next.js<br/>Port 4000]

    subgraph Backend Microservices
        QN[Question Service<br/>NestJS + MongoDB<br/>Port 3000]
        USER[User Service<br/>NestJS + Prisma + PostgreSQL<br/>Port 4001]
        MATCH[Matching Service<br/>NestJS + Socket.IO<br/>Port 3001]
        COLLAB[Collab Service<br/>NestJS + Yjs + LevelDB<br/>Port 3002]
    end

    subgraph External Services
        SUPA[(Supabase<br/>Auth + PostgreSQL)]
        MONGO[(MongoDB Atlas)]
    end

    FE -->|HTTP REST| QN
    FE -->|HTTP REST| USER
    FE -->|WebSocket| MATCH
    FE -->|WebSocket| COLLAB

    QN -->|JWT Auth| SUPA
    USER -->|Prisma ORM| SUPA
    MATCH -->|User Points| SUPA
    COLLAB -->|JWT Auth| SUPA

    QN -->|Questions + Attempts| MONGO
    USER -->|User Profiles| SUPA
    COLLAB -->|Document State| LDB[(LevelDB)]

    style FE fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style QN fill:#e535ab,stroke:#333,stroke-width:2px
    style USER fill:#e535ab,stroke:#333,stroke-width:2px
    style MATCH fill:#e535ab,stroke:#333,stroke-width:2px
    style COLLAB fill:#e535ab,stroke:#333,stroke-width:2px
    style SUPA fill:#3ecf8e,stroke:#333,stroke-width:2px
    style MONGO fill:#4db33d,stroke:#333,stroke-width:2px
```

### User Flow: Match → Collaborate → Submit

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant Auth as User Service
    participant Match as Matching Service
    participant Collab as Collab Service
    participant QN as Question Service

    User->>Auth: POST /auth/login
    Auth->>User: JWT Token

    User->>Match: WebSocket connect + JWT
    Match->>User: matched event (roomId)

    User->>Collab: WebSocket join(sessionId, JWT)
    Collab->>User: collab:state (Yjs doc)

    User->>QN: GET /questions?difficulty=medium
    QN->>User: Question list

    User->>Collab: collab:update (code changes)
    Collab->>User: Broadcast to peers

    User->>QN: POST /attempts (submit solution)
    QN->>User: Attempt recorded
```

---

## Services Overview

| Service              | Path                         | Protocol  | Container → Host Port | Purpose                                      |
| -------------------- | ---------------------------- | --------- | --------------------- | -------------------------------------------- |
| **Frontend**         | `./frontend`                 | HTTP      | `4000 → 4000`         | Next.js UI with Tailwind, Monaco, Yjs        |
| **Question Service** | `./backend/qn-service`       | HTTP REST | `3000 → 3000`         | Question CRUD, search, filtering, attempts   |
| **User Service**     | `./backend/user-service`     | HTTP REST | `4001 → 4001`         | User authentication, profiles (Prisma + JWT) |
| **Matching Service** | `./backend/matching-service` | WebSocket | `3000 → 3001`         | Real-time peer matching by difficulty/topics |
| **Collab Service**   | `./backend/collab-service`   | WebSocket | `3000 → 3002`         | Real-time collaborative code editing (Yjs)   |

### Tech Stack Summary

| Layer                | Technology                                                |
| -------------------- | --------------------------------------------------------- |
| **Frontend**         | Next.js 15, React 19, Tailwind CSS 4, Monaco Editor, Yjs  |
| **Backend**          | NestJS 10-11, Node.js 20 (Alpine), TypeScript 5.1-5.9     |
| **Databases**        | MongoDB (questions), PostgreSQL (users), LevelDB (collab) |
| **Real-time**        | Socket.IO 4.8.1, Yjs 13.6.27 (CRDTs)                      |
| **Authentication**   | Supabase Auth, JWT (HS256 / JWKS), jose, jsonwebtoken     |
| **ORM**              | Prisma 6.19.0 (user service)                              |
| **Containerization** | Docker + Docker Compose                                   |

---

## Quick Start (Docker Compose)

### Prerequisites

-   **Docker** and **Docker Compose** installed
-   **Environment files** configured (see [Environment Variables](#-environment-variables))

### Build and Run All Services

From the **repository root**:

```bash
# Build and start all services (frontend + backend)
docker compose up --build

# Run in detached mode (background)
docker compose up -d

# View logs (all services)
docker compose logs -f

# View logs for specific service
docker compose logs -f collab-service
docker compose logs -f frontend

# Stop all services
docker compose down

# Rebuild without cache
docker compose build --no-cache
```

### Run Individual Services

```bash
# Start only the question service
docker compose up qn

# Start user + question services
docker compose up user qn

# Start matching service only
docker compose up matching
```

### Docker Networking

All services are connected via the **`peerprep-net`** Docker bridge network, enabling inter-service communication by container name:

-   Question service: `http://qn:3000`
-   User service: `http://user:4001`
-   Matching service: `ws://matching:3000`
-   Collab service: `ws://collab:3000`

### Volume Mounts

The **Collaboration Service** persists LevelDB data to the host:

```yaml
volumes:
    - ./backend/collab-level-db:/data/leveldb
```

---

## Verify Deployment

Once all containers are running, verify each service:

| Service              | URL                                                          | Expected Response         |
| -------------------- | ------------------------------------------------------------ | ------------------------- |
| **Frontend**         | [http://localhost:4000](http://localhost:4000)               | Next.js app homepage      |
| **Question Service** | [http://localhost:3000/health](http://localhost:3000/health) | `{ "status": "ok", ... }` |
| **User Service**     | [http://localhost:4001/health](http://localhost:4001/health) | `{ "status": "ok", ... }` |
| **Matching Service** | `ws://localhost:3001/matching` (Socket.IO)                   | WebSocket connection      |
| **Collab Service**   | [http://localhost:3002/health](http://localhost:3002/health) | `{ "status": "ok", ... }` |

## Environment Variables

Each service requires a `.env` file in its directory. Below are the **required variables** for each service:

### Global Variables (Root `.env` - Optional)

Not used by default; services load their own `.env` files.

### Frontend (`frontend/.env`)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend Service URLs
NEXT_PUBLIC_QUESTION_SERVICE_URL=http://localhost:3000
NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:4001
NEXT_PUBLIC_MATCHING_SERVICE_URL=ws://localhost:3001
NEXT_PUBLIC_COLLAB_SERVICE_URL=ws://localhost:3002
```

### Question Service (`backend/qn-service/.env`)

```env
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:4000,http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_NAME=QuestionService
MONGODB_COLLECTION=Questions
ATTEMPTS_COLLECTION_NAME=QuestionAttempts

# Supabase Auth (HS256)
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
SUPABASE_JWT_AUD=authenticated
SUPABASE_ISS=https://your-project.supabase.co/auth/v1
```

### User Service (`backend/user-service/.env`)

```env
PORT=4001
NODE_ENV=development

# Supabase PostgreSQL (Prisma)
DATABASE_URL=postgresql://postgres:password@host:5432/database?schema=public

# Supabase Auth (JWKS)
SUPABASE_JWT_URL=https://your-project.supabase.co/auth/v1/certs
SUPABASE_JWT_AUD=authenticated

# MongoDB (Optional, if colocated question handling)
MONGODB_URI=mongodb+srv://...
MONGODB_NAME=QuestionService
MONGODB_COLLECTION=questions
```

### Matching Service (`backend/matching-service/.env`)

```env
PORT=3000
NODE_ENV=development

# Supabase (Optional, for fetching user points)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Matching Algorithm
BATCH_INTERVAL_MS=5000
```

### Collaboration Service (`backend/collab-service/.env`)

```env
PORT=3002
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:4000,http://localhost:3000

# LevelDB Persistence
COLLAB_SERVICE_PATH=/data/leveldb

# Supabase Auth
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

### Setup Checklist

-   [ ] Create `.env` files in all service directories
-   [ ] Set up Supabase project and copy JWT secrets/URLs
-   [ ] Configure MongoDB Atlas cluster and copy connection string
-   [ ] Ensure `CORS_ORIGINS` includes your frontend URL
-   [ ] Run `npx prisma generate` in `user-service` after setting `DATABASE_URL`
-   [ ] Verify LevelDB directory permissions for `collab-service`

---

## Local Development (without Docker)

### Prerequisites

-   **Node.js** 20+ and **npm** 9+
-   **MongoDB** connection string (for Question Service)
-   **Supabase** project (for User Service + Auth)

### Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend services
cd backend/qn-service && npm install
cd ../user-service && npm install
cd ../matching-service && npm install
cd ../collab-service && npm install
```

### Run Services

Open **5 separate terminals**:

#### Terminal 1: Frontend

```bash
cd frontend
npm run dev
```

**URL:** [http://localhost:4000](http://localhost:4000)

#### Terminal 2: Question Service

```bash
cd backend/qn-service
npm run start:dev
```

**URL:** [http://localhost:3000](http://localhost:3000)

#### Terminal 3: User Service

```bash
cd backend/user-service

# Generate Prisma client first
npx prisma generate

# Run migrations (if needed)
npx prisma migrate dev

# Start service
npm run start:dev
```

**URL:** [http://localhost:4001](http://localhost:4001)

#### Terminal 4: Matching Service

```bash
cd backend/matching-service
npm run start:dev
```

**URL:** `ws://localhost:3001` (WebSocket only; container runs on 3000, mapped to 3001)

#### Terminal 5: Collaboration Service

```bash
cd backend/collab-service
npm run start:dev
```

**URL:** [http://localhost:3002](http://localhost:3002) (WebSocket on `/collab`)

---

## Documentation Links

### Backend Overview

-   [Backend README](./backend/README.md) – Comprehensive backend architecture, tech stack, and workflows

### Service-Specific Documentation

| Service                   | Documentation                                                      |
| ------------------------- | ------------------------------------------------------------------ |
| **Question Service**      | [qn-service/README.md](./backend/qn-service/README.md)             |
| **User Service**          | [user-service/README.md](./backend/user-service/README.md)         |
| **Matching Service**      | [matching-service/README.md](./backend/matching-service/README.md) |
| **Collaboration Service** | [collab-service/README.md](./backend/collab-service/README.md)     |

### API Documentation

#### Question Service REST API

-   `GET /questions` – Paginated list with filters (topic, difficulty, search)
-   `GET /questions/:id` – Get question by ID
-   `POST /attempts` – Record a question attempt
-   `GET /attempts` – List attempts for authenticated user
-   `GET /health` – Health check

See [Question Service Query Guide](./backend/qn-service/README.md#question-service--query-guide) for detailed query parameters.

#### User Service REST API

-   `POST /auth/signup` – Register new user
-   `POST /auth/login` – Login and receive JWT
-   `GET /profile` – Get authenticated user profile
-   `PUT /profile` – Update user profile

See [User Service API](./backend/user-service/docs/API.md) for detailed endpoint specs.

#### Matching Service WebSocket API

**Namespace:** `ws://localhost:3001/matching`

-   `join-queue` – Enqueue for matching (userId, difficulty, topics)
-   `match:cancel` – Cancel matching request
-   `get-queue` – Get queue snapshot (debug)
-   Server emits `matched` – Match found (roomId, matchedUserId)

#### Collaboration Service WebSocket API

**Namespace:** `ws://localhost:3002/collab`

-   `collab:update` – Send Yjs document update
-   `collab:awareness` – Send cursor/selection state
-   `collab:language:set` – Set programming language
-   `collab:history:get` – Get edit history
-   `collab:revert` – Revert to specific timestamp
-   Server emits `collab:state` – Full document state
-   Server emits `collab:history:new` – New edit record

---

## Troubleshooting

### Port Conflicts

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**

-   **Docker:** Change host port mapping in `docker-compose.yml`:
    ```yaml
    ports:
        - "3001:3000" # Map to different host port
    ```
-   **Local:** Find and kill the process using the port:

    ```bash
    # Windows
    netstat -ano | findstr :3000
    taskkill /PID <PID> /F

    # Linux/macOS
    lsof -ti:3000 | xargs kill -9
    ```

### JWT Verification Errors

**Problem:** `401 Unauthorized` or `Invalid JWT signature`

**Solutions:**

-   Ensure `SUPABASE_JWT_SECRET` matches your Supabase project settings
-   Check `SUPABASE_ISS` matches `https://your-project.supabase.co/auth/v1`
-   Verify `SUPABASE_JWT_AUD` is set to `authenticated`
-   For User Service, confirm `SUPABASE_JWT_URL` points to the correct JWKS endpoint

### LevelDB Persistence Issues

**Problem:** Collaboration service fails to start with `EACCES` or `LOCK` error

**Solutions:**

-   Ensure `COLLAB_SERVICE_PATH` directory exists and is writable
-   Delete the LevelDB directory and restart (data will be reset):
    ```bash
    rm -rf backend/collab-level-db
    ```
-   For Docker, verify volume mount permissions:
    ```yaml
    volumes:
        - ./backend/collab-level-db:/data/leveldb
    ```

### MongoDB Connection Failures

**Problem:** Question service crashes with `MongoServerError: Authentication failed`

**Solutions:**

-   Verify `MONGODB_URI` connection string is correct
-   Ensure IP address is whitelisted in MongoDB Atlas Network Access
-   Check username/password and URL encoding:
    ```
    mongodb+srv://user:p%40ssword@cluster.mongodb.net/...
    ```

### Prisma Client Not Generated

**Problem:** `Cannot find module '@prisma/client'`

**Solutions:**

```bash
cd backend/user-service
npx prisma generate
```

Add to Dockerfile if missing:

```dockerfile
RUN npx prisma generate
```

### CORS Errors

**Problem:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solutions:**

-   Add frontend URL to `CORS_ORIGINS` in backend `.env` files:
    ```env
    CORS_ORIGINS=http://localhost:4000,http://localhost:3000
    ```
-   Restart services after changing environment variables

### Docker Build Failures

**Problem:** `ERROR [internal] load metadata for docker.io/library/node:20-alpine`

**Solutions:**

-   Check Docker daemon is running
-   Pull base image manually:
    ```bash
    docker pull node:20-alpine
    ```
-   Rebuild with `--no-cache`:
    ```bash
    docker compose build --no-cache
    ```

---

## Team

**CS3219 AY2526 S1 – Group G36**

| Name           | Role                               | Services              |
| -------------- | ---------------------------------- | --------------------- |
| Zyon Wee       | Question Catalogue                 | Question Service      |
| Jonathen Cheng | Auth & User Management             | User Service          |
| David Vicedo   | Collaboration & Real-time Features | Collaboration Service |
| Wong An Wei    | Matching & WebSocket Integration   | Matching Service      |
| Amos Chee      | Frontend UI                        | Frontend (Next.js)    |

---

## License

This project is licensed under the **MIT License**.

Copyright (c) 2024 CS3219-AY2425S1

See [LICENSE](./LICENSE) for full details.

---

**Questions?** Check the [backend README](./backend/README.md) or individual service READMEs for detailed documentation.
