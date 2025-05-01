# HackOps 2025 Submission

This repository serves as a submission for the HackOps 2025 DevOps competition, it demonstrates all the post-development workflows that can all work together and orchestrate deployments efficiently, as well as keeping the project safe from tiny TypeErrors bringing down the whole application.

This repository includes details on DevOps practices such as:

- [Monorepo Structure](#monorepo)
- [CI/CD Pipeline](#cicd-pipeline-github-actions)
- [Testing Strategy](#testing-strategy)
- [Containerization](#container-orchestration)
- [Dependency Management](#dependency-management)
- [Performance Optimizations](#performance-optimizations)
- [Security Considerations](#security-considerations)
- [Resource Management](#resource-management)
- [Scaling Considerations](#scaling-considerations)
- [Technical Debt & Known Issues](#technical-debt--known-issues)
- [Commands](#commands)
- [Flow Diagram](#flow-diagram)

## Monorepo

This repository implements a monorepo structure using pnpm workspaces, it lets us manage the server and client from the same repo, as well as manage all the deployments for each services from the same place. It also includes a shared package that can be used by all other packages for consistency purposes. The structure is as follows:

```tree
/ (root)
├─ packages/
│  ├─ client/                  # React + Vite single-page app
│  ├─ server/                  # Express API server
│  └─ shared/                  # TypeScript types and interfaces
├─ pnpm-workspace.yaml         # PNPM workspace config
├─ docker-compose.yml          # Docker Compose config
├─ Dockerfile                  # Docker build config
├─ pnpm-lock.yaml              # PNPM lockfile
└─ package.json                # Root scripts and workspace config
```

## CI/CD Pipeline (GitHub Actions)

Triggered on pushes to main and on pull requests:

1. Validate job

- Linting, type-check, unit & E2E tests
- Caches PNPM store for speed
- Installs Playwright system deps

2. Deploy job

- Builds Docker images for client & server
- Pushes to GitHub Container Registry
- SSH into VPS, pulls new images
- Deploys with Docker Compose

## Testing Strategy

- Jest for unit & integration tests (both client & server)
- Playwright for cross-browser end-to-end tests
- Stress testing script to validate performance under load (only manually, not in CI/CD pipeline)
- All tests run in CI before deployment

## Container Orchestration

- Docker Compose defines services:
  - client (port 3000)
  - server (port 3001)
- Health checks for the server endpoint /api/health
- Resource limits: 512 MB memory for the server
- Restart policy: unless-stopped

## Dependency Management

- **PNPM** ensures disk-efficient, fast installs, and our monorepo managmnet tool
- **Dependabot** configured for weekly dependency and action updates
- Separate schedules for updating npm packages vs. GitHub Actions
- **Husky** + **lint-staged** to enforce code quality on commits

## Performance Optimizations

- Debounced Socket.IO broadcasts to reduce noise
- Explicit cleanup of timers & subscriptions in server to avoid leaks
- Docker layer caching optimizations in the build
- Memory monitoring and cleanup during stress tests
- Pagination on API/Websockets to reduce payload size
- Tailwind CSS v4 with Vite for on-demand styles
- Locking/Transaction mechanism to prevent race conditions

## Security Considerations

- **CORS** properly scoped in production
- Secrets managed via environment variables (no hard-coded creds)
- Production builds minified & stripped of dev tooling
- Regular dependency updates via Dependabot

## Resource Management

- Server container capped at **512 MB** RAM for my DigitalOcean droplet
- Only production deps in final Docker layers
- Alpine base images for minimal footprint

## Scaling Considerations

- Real-time events via **Socket.IO** (Redis adapter required for multi-instance)
- In-memory data store is ephemeral—swap for a persistent DB in prod
- Health checks to auto-recover unhealthy containers
- Even more defined resource limits for predictable performance

## Technical Debt & Known Issues

- Tracing module temporarily disabled (commented out)
- Uses in-memory store—no database persistence
- No authentication/authorization implemented

## Commands

### Local Development

```bash
pnpm dev                         # Start client & server in watch mode
pnpm build                       # Build all workspaces
pnpm test                        # Run Jest unit tests
pnpm e2e                         # Run Playwright E2E tests
pnpm typecheck                   # Type check all workspaces
pnpm --filter server dev         # Start server in watch mode
pnpm --filter client dev         # Start client in watch mode
pnpm --filter server stress-test # Start stress testing script
```

## Flow Diagram

````mermaid
flowchart TD
  subgraph Development
    dev[Developer Codes] --> husky[Husky Pre-commit Checks]
    husky --> commit[Commit to GitHub]
    commit --> pr[Create Pull Request]
  end

  subgraph "CI/CD Pipeline"
    pr --> validate[GitHub Actions: Validate Job]
    validate --> tests[Run Tests]
    tests --> build[Build Application]

    subgraph Testing
      tests --> lint[ESLint]
      tests --> typecheck[TypeScript Check]
      tests --> unittest[Jest Unit Tests]
      tests --> e2e[Playwright E2E Tests]
    end

    build --> merge[Merge to Main]
    merge --> deploy[GitHub Actions: Deploy Job]
  end

  subgraph Dockerization
    deploy --> docker_build[Build Docker Images]
    docker_build --> client_img[Client Image]
    docker_build --> server_img[Server Image]
    client_img --> push_registry[Push to GitHub Container Registry]
    server_img --> push_registry
  end

  subgraph "VPS Deployment"
    push_registry --> ssh_vps[SSH into VPS]
    ssh_vps --> pull_images[Pull Latest Images]
    pull_images --> compose[Create docker-compose.yml]
    compose --> restart[Restart Containers]
    restart --> nginx[Automatically Configure Nginx]
    nginx --> ssl[Set Up SSL with Certbot]
    ssl --> restart2[Restart Nginx]
  end

  classDef dev fill:#d4f1f9,stroke:#05a,stroke-width:2px
  classDef ci fill:#ffe6cc,stroke:#d79b00,stroke-width:2px
  classDef docker fill:#d5e8d4,stroke:#82b366,stroke-width:2px
  classDef vps fill:#e1d5e7,stroke:#9673a6,stroke-width:2px

  class Development dev
  class CI/CD_Pipeline ci
  class Dockerization docker
  class VPS_Deployment vps
```
