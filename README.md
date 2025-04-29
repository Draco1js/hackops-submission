# HackOps DevOps Showcase

This repository contains our DevOps implementation for the HackOps hackathon, demonstrating a full-fledged, production-ready pipeline for a modern web application. Our monorepo leverages PNPM workspaces and TypeScript, with separate client and server packages, containerized deployments, CI/CD automation, testing strategies, observability, and performance optimizations.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Monorepo Structure](#monorepo-structure)
- [Docker Implementation](#docker-implementation)
- [CI/CD Pipeline (GitHub Actions)](#cicd-pipeline-github-actions)
- [Testing Strategy](#testing-strategy)
- [Container Orchestration](#container-orchestration)
- [Monitoring and Observability](#monitoring-and-observability)
- [Dependency Management](#dependency-management)
- [Performance Optimizations](#performance-optimizations)
- [Security Considerations](#security-considerations)
- [Deployment Process](#deployment-process)
- [Configuration Files](#configuration-files)
- [Environment Variables](#environment-variables)
- [Network Configuration](#network-configuration)
- [Resource Management](#resource-management)
- [Scaling Considerations](#scaling-considerations)
- [Technical Debt & Known Issues](#technical-debt--known-issues)
- [Commands](#commands)

---

## Project Overview

HackOps is a competitive hackathon where teams showcase their DevOps expertise by building a fully automated, scalable, and observable application pipeline. Our solution features:

- A **monorepo** with distinct client, server, and shared packages
- **TypeScript** across all code with strict type checking
- **Docker** multi-stage builds and slim runtime images
- **GitHub Actions**–driven CI/CD with build caching, tests, and deployments
- End-to-end and unit testing with **Playwright** and **Jest**
- Runtime orchestration via **Docker Compose** on a VPS
- Observability with **OpenTelemetry** and structured logging


## Monorepo Structure

```
/ (root)
├─ packages/
│  ├─ client/      # React + Vite single-page app
│  ├─ server/      # Express API server
│  └─ shared/      # TypeScript types and interfaces
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
└─ package.json    # Root scripts and workspace config
```

- **PNPM workspaces** ensure efficient installs and consistent deps
- **Strict TypeScript** settings guarantee type safety across boundaries


## Docker Implementation

- **Base image**: `node:20-alpine`
- **Multi-stage builds** to produce minimal final images
- Separate build targets (`client` and `server`) in a single Dockerfile
- Only production dependencies in final runtime layers
- **PNPM** network retry settings for resilient installs
- **Environment variables** configured for production in the build

<details>
<summary><code>Dockerfile</code> (multi-stage excerpt)</summary>

```dockerfile
# Base
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=development   # overridden in final
ENV HUSKY=0
RUN npm install -g pnpm@8.15.4 typescript
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/

# Client build
FROM base AS client
WORKDIR /app/packages/client
COPY packages/client/package.json .
COPY packages/shared ../shared
RUN pnpm install
COPY packages/client .
RUN pnpm build

# Server build
FROM base AS server
WORKDIR /app/packages/server
COPY packages/server/package.json .
COPY packages/shared ../shared
RUN pnpm install
COPY packages/server .
RUN pnpm build

# Runtime images...
```

</details>


## CI/CD Pipeline (GitHub Actions)

Triggered on pushes to `main` and on pull requests:

1. **Validate job**
   - Linting, type-check, unit & E2E tests
   - Caches PNPM store for speed
   - Installs Playwright system deps
2. **Deploy job**
   - Builds Docker images for client & server
   - Pushes to GitHub Container Registry
   - SSH into VPS, pulls new images
   - Deploys with Docker Compose

<details>
<summary><code>.github/workflows/ci.yml</code> excerpt</summary>

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
      - uses: actions/cache@v3
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
  deploy:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: docker build --target client -t ghcr.io/yourorg/client:latest .
      - run: docker push ghcr.io/yourorg/client:latest
      - run: |
          ssh user@vps.example.com << 'EOF'
            docker pull ghcr.io/yourorg/client:latest
            docker-compose pull && docker-compose up -d
          EOF
```

</details>


## Testing Strategy

- **Jest** for unit & integration tests (both client & server)
- **Playwright** for cross-browser end-to-end tests
- **Stress testing** script to validate performance under load
- All tests run in CI before deployment


## Container Orchestration

- **Docker Compose** defines services:
  - `client` (port 3000)
  - `server` (port 3001)
- Health checks for the server endpoint `/api/health`
- Resource limits: 512 MB memory for the server
- Restart policy: `unless-stopped`


## Monitoring and Observability

- **OpenTelemetry** integrated for distributed tracing
- `/api/health` endpoint for liveness checks
- **Morgan** middleware for HTTP request logging
- Stress test hooks to ensure observability under load


## Dependency Management

- **PNPM** ensures disk-efficient, fast installs
- **Dependabot** configured for weekly dependency and action updates
- Separate schedules for updating npm packages vs. GitHub Actions
- **Husky** + **lint-staged** to enforce code quality on commits


## Performance Optimizations

- Debounced Socket.IO broadcasts to reduce noise
- Explicit cleanup of timers & subscriptions in server to avoid leaks
- Docker layer caching optimizations in the build
- **Tailwind CSS v4** with Vite for on-demand styles


## Security Considerations

- **CORS** properly scoped in production
- Secrets managed via environment variables (no hard-coded creds)
- Production builds minified & stripped of dev tooling
- Regular dependency updates via Dependabot


## Deployment Process

1. Merge code into `main`
2. GitHub Actions pipeline runs tests, builds images, pushes to registry
3. GitHub Actions deploys to VPS:
   - Pulls latest images
   - Updates `docker-compose.yml`
   - Restarts services
   - Configures Nginx as a reverse proxy
   - Sets up SSL with Let's Encrypt

### Setting Up GitHub Secrets for Deployment

To enable automatic deployment to your VPS, you need to set up the following GitHub secrets:

1. `VPS_HOST`: Your VPS IP address
2. `VPS_USERNAME`: The username to connect to your VPS (usually `root`)
3. `VPS_SSH_KEY`: Your SSH private key for connecting to the VPS

You can use the provided script to set up these secrets:

```bash
# Make sure you have the GitHub CLI installed
# https://cli.github.com/

# Run the setup script
./scripts/setup-github-secrets.sh
```

### Domain Configuration

The deployment is configured to work with the domain `hackops.dracodev.me`. Make sure your domain's DNS records point to your VPS IP address:

- Create an A record for `hackops.dracodev.me` pointing to your VPS IP address


## Configuration Files

- `docker-compose.yml`: service definitions & orchestration
- `Dockerfile`: multi-stage build for client & server
- `.github/workflows/ci.yml`: CI/CD definitions
- `playwright.config.ts`: E2E test settings
- `tsconfig.json`: root TS config
- `.npmrc`: PNPM settings & registry
- `.gitignore`: excludes logs, `node_modules`, build artifacts


## Environment Variables

- `NODE_ENV` (production/development)
- `PORT` (server port, default `3001`)
- `VITE_SERVER_URL` (client API endpoint)
- `DISABLE_TRACING` (toggle OpenTelemetry)
- `STRESS_TEST` (enable performance tests)


## Network Configuration

- Client exposed on `3000`
- Server exposed on `3001`
- Client ↔ Server communication via REST & WebSockets
- `CORS` patterns: permissive in dev, locked-down in prod


## Resource Management

- Server container capped at **512 MB** RAM
- Only production deps in final Docker layers
- Alpine base images for minimal footprint


## Scaling Considerations

- Real-time events via **Socket.IO** (Redis adapter required for multi-instance)
- In-memory data store is ephemeral—swap for a persistent DB in prod
- Health checks to auto-recover unhealthy containers
- Defined resource limits for predictable performance


## Technical Debt & Known Issues

- Tracing module temporarily disabled (commented out)
- Uses in-memory store—no database persistence
- No authentication/authorization implemented


## Commands

### Local Development

```bash
pnpm dev       # Start client & server in watch mode
pnpm build     # Build all workspaces
pnpm test      # Run Jest unit tests
pnpm e2e       # Run Playwright E2E tests
pnpm typecheck # Perform TS type checking
```

### Deployment

```bash
docker-compose up -d      # Launch containers
docker-compose down       # Stop containers
docker pull [image]       # Pull latest image
docker logs [container]   # Inspect logs
```

