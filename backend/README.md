# 🚀 PeerPrep Backend

> **Microservices Architecture for Collaborative Coding Platform**

The PeerPrep backend is a collection of NestJS-based microservices that power a real-time collaborative coding platform. It handles user authentication, question management, peer matching, and live collaborative code editing.

---

## 📋 Table of Contents

-   [Overview](#-overview)
-   [Architecture](#-architecture)
-   [Services](#-services)
-   [Tech Stack](#-tech-stack)
-   [Quick Start](#-quick-start)
-   [Docker Setup](#-docker-setup)
-   [Environment Variables](#-environment-variables)
-   [Development Workflow](#-development-workflow)
-   [Service Documentation](#-service-documentation)
-   [Network & Ports](#-network--ports)
-   [Contributors](#-contributors)

---

## 🌟 Overview

The backend consists of **four independent microservices**, each responsible for a specific domain:

1. **Question Service** – Manages coding questions, search, filtering, and user attempt tracking
2. **User Service** – Handles user authentication, profiles, and authorization via Supabase
3. **Matching Service** – Real-time WebSocket-based peer matching by difficulty and topic
4. **Collaboration Service** – Real-time collaborative code editing using Yjs CRDTs and Socket.IO

All services are containerized with Docker and orchestrated via Docker Compose for seamless local development and deployment.

---

## 🏗️ Architecture

```mermaid
graph TB
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

### Component Interaction Flow

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

## 📦 Services

### Service Overview Table

| Service              | Port | Protocol  | Description                                    | Database   | Auth Method        |
| -------------------- | ---- | --------- | ---------------------------------------------- | ---------- | ------------------ |
| **Question Service** | 3000 | HTTP REST | Questions CRUD, search, filtering, attempts    | MongoDB    | Bearer JWT (HS256) |
| **User Service**     | 4001 | HTTP REST | User profiles, authentication, authorization   | PostgreSQL | Bearer JWT (JWKS)  |
| **Matching Service** | 3001 | WebSocket | Real-time peer matching by difficulty & topics | In-Memory  | JWT in handshake   |
| **Collab Service**   | 3002 | WebSocket | Collaborative code editing with Yjs CRDTs      | LevelDB    | JWT in handshake   |

---

## 🛠️ Tech Stack

### Core Technologies

| Layer                | Technology                           |
| -------------------- | ------------------------------------ |
| **Framework**        | [NestJS](https://nestjs.com/) v10-11 |
| **Runtime**          | Node.js 20 (Alpine in Docker)        |
| **Language**         | TypeScript ^5.1-5.7                  |
| **Package Manager**  | npm 9+                               |
| **Containerization** | Docker + Docker Compose              |

### Service-Specific Stack

#### Question Service

-   **Database**: MongoDB (Atlas) via native driver ^6.20
-   **Auth**: jose ^6.1.0 (HS256 JWT verification)
-   **ORM**: None (native MongoDB client)

#### User Service

-   **Database**: PostgreSQL (Supabase)
-   **ORM**: Prisma ^6.19.0
-   **Auth**: jose (JWKS verification from Supabase)

#### Matching Service

-   **WebSocket**: Socket.IO ^4.8.1
-   **Data Store**: In-memory (planned: Redis via ioredis ^5.8.1)
-   **Auth**: jsonwebtoken ^9.0.2
-   **External API**: Supabase (fetch user points)

#### Collaboration Service

-   **CRDT Engine**: Yjs ^13.6.27 + y-protocols ^1.0.6
-   **WebSocket**: Socket.IO ^4.8.1
-   **Persistence**: LevelDB (classic-level ^3.0.0)
-   **Auth**: jsonwebtoken ^9.0.2

### Shared Dependencies

-   **Testing**: Jest ^29-30 + ts-jest
-   **Linting**: ESLint ^8-9 + Prettier ^3.4
-   **Dev Tools**: ts-node, tsx, nodemon equivalents

---

## 🚀 Quick Start

### Prerequisites

-   **Node.js** 20+ and **npm** 9+
-   **Docker** and **Docker Compose** (for containerized setup)
-   **MongoDB** connection string (for Question Service)
-   **Supabase** project (for User Service + Auth)

### Installation

```bash
# Clone the repository
git clone https://github.com/CS3219-AY2526Sem1/cs3219-ay2526s1-project-g36.git
cd cs3219-ay2526s1-project-g36/backend

# Install dependencies for all services
cd qn-service && npm install && cd ..
cd user-service && npm install && cd ..
cd matching-service && npm install && cd ..
cd collab-service && npm install && cd ..
```

### Running Individual Services (Development)

```bash
# Question Service
cd qn-service
npm run start:dev

# User Service
cd user-service
npm run start:dev

# Matching Service
cd matching-service
npm run start:dev

# Collaboration Service
cd collab-service
npm run start:dev
```

---

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

Docker Compose orchestrates all four services with shared networking and volume mounts.

```bash
# From the backend/ directory

# Build and start all services
docker-compose up --build

# Start specific service
docker-compose up qn
docker-compose up user
docker-compose up matching
docker-compose up collab

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Rebuild without cache
docker-compose build --no-cache
```

### Service URLs (Docker)

| Service  | Container Port | Host Port | URL                        |
| -------- | -------------- | --------- | -------------------------- |
| Question | 3000           | 3000      | http://localhost:3000      |
| User     | 4001           | 4001      | http://localhost:4001      |
| Matching | 3000           | 3001      | ws://localhost:3001        |
| Collab   | 3000           | 3002      | ws://localhost:3002/collab |

### Network Configuration

All services are connected via the `peerprep-net` Docker network, enabling inter-service communication by container name:

```yaml
networks:
    default:
        name: peerprep-net
```

### Volume Mounts

-   **Collab Service**: LevelDB data persisted to `./collab-level-db:/data/leveldb`

---

## 🔐 Environment Variables

### Common Variables

All services share similar environment setup patterns:

```bash
# Server
PORT=<service_port>
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:4000

# Supabase Auth
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
SUPABASE_JWT_AUD=authenticated
SUPABASE_ISS=https://your-project.supabase.co/auth/v1
```

### Service-Specific Environment Files

Each service requires a `.env` file in its directory:

#### Question Service (`qn-service/.env`)

```bash
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:4000

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

#### User Service (`user-service/.env`)

```bash
PORT=4001
NODE_ENV=development

# Supabase PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/database?schema=public

# Supabase Auth (JWKS)
SUPABASE_JWT_URL=https://YOUR_PROJECT.supabase.co/auth/v1/certs
SUPABASE_JWT_AUD=authenticated

# MongoDB (Optional)
MONGODB_URI=mongodb+srv://...
MONGODB_NAME=QuestionService
MONGODB_COLLECTION=questions
```

#### Matching Service (`matching-service/.env`)

```bash
PORT=3000
NODE_ENV=development

# Supabase (Optional - for fetching user points)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Matching Algorithm
BATCH_INTERVAL_MS=5000
```

#### Collaboration Service (`collab-service/.env`)

```bash
PORT=3002
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:4000

# LevelDB Persistence
COLLAB_SERVICE_PATH=/data/leveldb

# Supabase Auth
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

### Environment Setup Checklist

-   [ ] Create `.env` files in each service directory
-   [ ] Set up Supabase project and copy JWT secrets/URLs
-   [ ] Configure MongoDB Atlas cluster and copy connection string
-   [ ] Ensure CORS_ORIGINS includes your frontend URL
-   [ ] Run `npx prisma generate` in user-service after setting DATABASE_URL
-   [ ] Verify LevelDB directory permissions for collab-service

---

## 💻 Development Workflow

### Development Commands

Each service supports standard NestJS scripts:

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug

# Run tests
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e

# Linting & Formatting
npm run lint
npm run format
```

### Health Checks

Each service exposes health endpoints:

```bash
# Question Service
curl http://localhost:3000/health
curl http://localhost:3000/healthz

# User Service
curl http://localhost:4001/health

# Collab Service
curl http://localhost:3002/health
```

### Testing Workflow

```bash
# Test all services
./test-all.sh  # Create this script if needed

# Or test individually
cd qn-service && npm test
cd user-service && npm test
cd matching-service && npm test
cd collab-service && npm test
```

### Database Management

#### Question Service (MongoDB)

```bash
# Seed attempts
export QN_TOKEN=<your-jwt-token>
node qn-service/scripts/seed_attempts.js 100
```

#### User Service (Prisma + PostgreSQL)

```bash
cd user-service

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev
npx prisma migrate deploy  # Production

# Open Prisma Studio (GUI)
npx prisma studio
```

#### Collaboration Service (LevelDB)

```bash
# Data persists in ./collab-level-db/
# Backup: Copy the directory
# Clear: Delete the directory (service will recreate)
```

---

## 📚 Service Documentation

Detailed documentation for each service is available in their respective directories:

| Service                   | Documentation                                              |
| ------------------------- | ---------------------------------------------------------- |
| **Question Service**      | [qn-service/README.md](./qn-service/README.md)             |
| **User Service**          | [user-service/README.md](./user-service/README.md)         |
| **Matching Service**      | [matching-service/README.md](./matching-service/README.md) |
| **Collaboration Service** | [collab-service/README.md](./collab-service/README.md)     |

### API Documentation

#### Question Service REST API

-   `GET /questions` - Paginated question list with filters (topic, difficulty, search)
-   `GET /questions/:id` - Get question by ID
-   `POST /attempts` - Record a question attempt
-   `GET /attempts` - List attempts for authenticated user
-   `GET /health` - Health check

See [Question Service Query Guide](./qn-service/README.md#question-service--query-guide) for detailed query parameters.

#### User Service REST API

-   `POST /auth/signup` - Register new user
-   `POST /auth/login` - Login and receive JWT
-   `GET /profile` - Get authenticated user profile
-   `PUT /profile` - Update user profile
-   `GET /questions` - List questions (if colocated)

See [User Service API](./user-service/docs/API.md) for detailed endpoint specs.

#### Matching Service WebSocket API

**Namespace:** `ws://localhost:3001/matching`

-   `join-queue` - Enqueue for matching (userId, difficulty, topics)
-   `match:cancel` - Cancel matching request
-   `get-queue` - Get queue snapshot (debug)
-   Server emits `matched` - Match found (roomId, matchedUserId)

#### Collaboration Service WebSocket API

**Namespace:** `ws://localhost:3002/collab`

-   `collab:update` - Send Yjs document update
-   `collab:awareness` - Send cursor/selection state
-   `collab:language:set` - Set programming language
-   `collab:history:get` - Get edit history
-   `collab:revert` - Revert to specific timestamp
-   Server emits `collab:state` - Full document state
-   Server emits `collab:history:new` - New edit record

---

## 🌐 Network & Ports

### Port Summary

| Service               | Development | Docker (Host) | Docker (Container) |
| --------------------- | ----------- | ------------- | ------------------ |
| Question Service      | 3000        | 3000          | 3000               |
| User Service          | 4001        | 4001          | 4001               |
| Matching Service      | 3000        | 3001          | 3000               |
| Collaboration Service | 3002        | 3002          | 3000               |

### CORS Configuration

All services are configured to accept requests from the frontend:

```typescript
// Default CORS setup (can override via CORS_ORIGINS env)
app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:4000"],
    credentials: true,
});
```

### Docker Network

Services communicate within `peerprep-net`:

```bash
# Example: User Service calling Question Service
http://qn:3000/questions
```

---

## 👥 Contributors

| Name           | Role                               | Services              |
| -------------- | ---------------------------------- | --------------------- |
| Zyon Wee       | Question Catalogue                 | Question Service      |
| Jonathen Cheng | Auth & User Management             | User Service          |
| David Vicedo   | Collaboration & Real-time Features | Collaboration Service |
| Wong An Wei    | Matching & WebSocket Integration   | Matching Service      |

---
