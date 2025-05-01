# My HackOps 2025 Journey: Building a Full DevOps Pipeline in 72 Hours

![DevOps Pipeline](https://images.unsplash.com/photo-1607799279861-4dd421887fb3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80)

## Introduction

When I signed up for HackOps 2025, I knew I was in for a challenge. The goal? Build a complete DevOps pipeline for a full-stack application in just 72 hours. This wasn't just about writing code—it was about creating a robust, automated system that could take code from development to production with minimal human intervention.

In this blog post, I'll walk you through my three-day journey, the obstacles I faced, and how I overcame them to create a comprehensive DevOps solution that I'm proud of.

## Day 1: Planning and Initial Setup

### 8:00 AM: The Kickoff

The hackathon began with a virtual kickoff meeting. The challenge was unveiled: create a DevOps pipeline for a Todo application that would include:

- Continuous Integration/Continuous Deployment
- Containerization
- Automated testing
- Monitoring
- Security considerations

I immediately started planning my approach. I decided to use a monorepo structure with PNPM workspaces to manage both the client and server code in a single repository.

### 10:00 AM: Setting Up the Project Structure

I began by creating the basic project structure:

```bash
mkdir -p packages/{client,server,shared}
touch pnpm-workspace.yaml
```

My `pnpm-workspace.yaml` was simple but effective:

```yaml
packages:
  - 'packages/client'
  - 'packages/server'
  - 'packages/shared'
```

### 1:00 PM: Technology Choices

After some research, I settled on the following technology stack:

- **Frontend**: React 19 with Vite and Tailwind CSS v4
- **Backend**: Express.js with Socket.IO for real-time updates
- **Testing**: Jest for unit tests, Playwright for E2E tests
- **CI/CD**: GitHub Actions
- **Containerization**: Docker and Docker Compose
- **Deployment**: Digital Ocean VPS

### 4:00 PM: First Obstacle - Tailwind CSS v4 Integration

I wanted to use the latest Tailwind CSS v4, which had just been released. However, I quickly discovered that the traditional integration method with PostCSS plugins wouldn't work with v4.

**Solution**: After digging through the documentation, I found that Tailwind CSS v4 now offers a Vite plugin. I implemented it in my `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

### 8:00 PM: Basic Application Functionality

By the end of Day 1, I had a basic Todo application working:
- React frontend with Tailwind CSS styling
- Express backend with a simple in-memory store
- Socket.IO for real-time updates

## Day 2: Testing, Docker, and CI/CD

### 7:00 AM: Setting Up Testing

I started Day 2 by implementing a comprehensive testing strategy:

1. **Unit Tests with Jest**:

```typescript
// Example test for the Todo component
test('renders todo item correctly', () => {
  const todo = { id: '1', text: 'Test Todo', completed: false };
  render(<TodoItem todo={todo} onToggle={() => {}} onDelete={() => {}} />);
  
  expect(screen.getByText('Test Todo')).toBeInTheDocument();
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});
```

2. **End-to-End Tests with Playwright**:

```typescript
test('can add a new todo', async ({ page }) => {
  await page.goto('/');
  await page.fill('[placeholder="Add a new task..."]', 'Test E2E Todo');
  await page.press('[placeholder="Add a new task..."]', 'Enter');
  
  await expect(page.locator('.todo-item')).toContainText('Test E2E Todo');
});
```

### 10:00 AM: Obstacle - Playwright Configuration

Setting up Playwright to test both the client and server simultaneously proved challenging. I needed to start both services before running tests.

**Solution**: I configured Playwright to start both services in its configuration:

```typescript
// playwright.config.ts
export default defineConfig({
  webServer: [
    {
      command: 'pnpm --filter server dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter client dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### 1:00 PM: Dockerizing the Application

Next, I created a Dockerfile with multi-stage builds to optimize the final images:

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=development
ENV HUSKY=0

# Install pnpm
RUN npm install -g pnpm@8.15.4 typescript

# Copy package files first for better caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

# Install dependencies with aggressive retry settings
RUN pnpm config set network-timeout 300000 && \
    pnpm install --force --ignore-scripts

# Copy source code and build
COPY . .
RUN pnpm build

# Client image
FROM node:20-alpine AS client
WORKDIR /app
RUN npm install -g serve
COPY --from=base /app/packages/client/dist /app/client
EXPOSE 3000
CMD ["serve", "-s", "/app/client", "-l", "3000"]

# Server image
FROM node:20-alpine AS server
WORKDIR /app
COPY --from=base /app/packages/server/dist /app/server
COPY --from=base /app/packages/shared/dist /app/shared/dist
EXPOSE 3001
CMD ["node", "/app/server/index.js"]
```

### 3:00 PM: Obstacle - Docker Build Performance

The Docker build was taking too long, especially in the CI environment.

**Solution**: I implemented several optimizations:
- Copied package files first to leverage Docker layer caching
- Used aggressive retry settings for network operations
- Installed only production dependencies in the final images

### 5:00 PM: Setting Up GitHub Actions

I created a GitHub Actions workflow for CI/CD:

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
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install pnpm
        uses: pnpm/action-setup@v3
      # Cache PNPM store for faster builds
      - name: Get pnpm store directory
        id: pnpm-cache
        run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT
      - uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
      # Run tests and build
      - name: Install dependencies
        run: pnpm install
      - name: Type check
        run: pnpm typecheck
      - name: End-to-end tests
        run: pnpm e2e
      - name: Build
        run: pnpm build

  deploy:
    needs: validate
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      # Build and push Docker images
      - name: Build and push client image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/hackops/client:latest
          target: client
      # Deploy to VPS
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            # Pull latest images and restart containers
            docker-compose down
            docker-compose up -d
```

### 8:00 PM: Obstacle - GitHub Actions Secrets

I needed to securely store VPS credentials for deployment.

**Solution**: I created a script to set up GitHub secrets:

```bash
#!/bin/bash
# scripts/setup-github-secrets.sh

REPO="username/repo"

echo "Setting up secrets for repository: $REPO"

# Set VPS_HOST secret
gh secret set VPS_HOST --body "142.93.160.146" --repo "$REPO"

# Set VPS_USERNAME secret
gh secret set VPS_USERNAME --body "root" --repo "$REPO"

# Set VPS_SSH_KEY secret
gh secret set VPS_SSH_KEY --body "$(cat vps.key)" --repo "$REPO"

echo "GitHub secrets have been set up successfully!"
```

## Day 3: Performance Optimization, Security, and Final Deployment

### 7:00 AM: Performance Optimization

I started Day 3 by addressing performance concerns:

1. **Debounced Socket.IO Broadcasts**:

```typescript
// Optimize broadcasting by limiting frequency
let broadcastPending = false;
const broadcastTodos = () => {
  if (broadcastPending) return;
  
  broadcastPending = true;
  
  // Debounce broadcasts to reduce frequency
  setTimeout(() => {
    io.emit('todos:update', todos);
    broadcastPending = false;
  }, 50);
};
```

2. **Mutex-like Locking for Concurrent Operations**:

```typescript
// Add mutex-like locking mechanism
const locks = new Map<string, boolean>();

// Helper function to acquire a lock
const acquireLock = (id: string): boolean => {
  if (locks.has(id)) return false;
  locks.set(id, true);
  return true;
};

// Helper function to release a lock
const releaseLock = (id: string): void => {
  locks.delete(id);
};
```

### 10:00 AM: Stress Testing

I created a stress testing script to validate performance under load:

```typescript
// packages/server/src/stress-test.ts
import axios from 'axios';
import { io } from 'socket.io-client';

// Stress test configuration
const NUM_USERS = 600;
const OPERATIONS_PER_USER = 60;
const DELAY_BETWEEN_OPS_MS = 20;

async function runStressTest() {
  console.log(`Starting stress test with ${NUM_USERS} users...`);
  
  // Create users
  const users = Array.from({ length: NUM_USERS }, (_, i) => ({
    id: `user-${i}`,
    socket: io('http://localhost:3001'),
    todos: []
  }));
  
  // Run operations
  for (let i = 0; i < OPERATIONS_PER_USER; i++) {
    await Promise.all(users.map(async (user) => {
      // Randomly choose an operation
      const op = Math.floor(Math.random() * 3);
      
      try {
        if (op === 0) {
          // Add todo
          const response = await axios.post('http://localhost:3001/api/todos', {
            text: `Todo ${i} from ${user.id}`
          });
          user.todos.push(response.data);
        } else if (op === 1 && user.todos.length > 0) {
          // Toggle todo
          const todoIndex = Math.floor(Math.random() * user.todos.length);
          const todo = user.todos[todoIndex];
          await axios.put(`http://localhost:3001/api/todos/${todo.id}`, {
            completed: !todo.completed
          });
        } else if (op === 2 && user.todos.length > 0) {
          // Delete todo
          const todoIndex = Math.floor(Math.random() * user.todos.length);
          const todo = user.todos[todoIndex];
          await axios.delete(`http://localhost:3001/api/todos/${todo.id}`);
          user.todos.splice(todoIndex, 1);
        }
      } catch (error) {
        console.error(`Operation failed for ${user.id}:`, error.message);
      }
      
      // Add delay between operations
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_OPS_MS));
    }));
    
    // Log progress
    console.log(`Completed operation batch ${i + 1}/${OPERATIONS_PER_USER}`);
  }
  
  // Clean up
  users.forEach(user => user.socket.disconnect());
  console.log('Stress test completed!');
}

runStressTest().catch(console.error);
```

### 1:00 PM: Obstacle - Memory Leaks Under Load

During stress testing, I discovered memory leaks in the server.

**Solution**: I implemented proper cleanup of timers and event listeners:

```typescript
// Clean up resources when a client disconnects
io.on('connection', (socket) => {
  onlineUsers++;
  io.emit('users:update', onlineUsers);
  
  socket.on('disconnect', () => {
    onlineUsers--;
    io.emit('users:update', onlineUsers);
    
    // Clean up any locks this user might have had
    for (const [id, locked] of locks.entries()) {
      if (id.startsWith(socket.id)) {
        locks.delete(id);
      }
    }
  });
});
```

### 3:00 PM: Setting Up Nginx and SSL

I created an Nginx configuration for the production environment:

```nginx
server {
    listen 80;
    server_name hackops.dracodev.me;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

I added Certbot configuration to the deployment script for automatic SSL setup:

```yaml
- name: Set up SSL certificate
  run: |
    certbot --nginx -d hackops.dracodev.me --non-interactive --agree-tos --email admin@example.com
```

### 5:00 PM: Final Deployment and Testing

I performed a final deployment to my Digital Ocean VPS and ran through a comprehensive test plan:

1. Manual testing of all features
2. Verification of CI/CD pipeline
3. Stress testing in production environment
4. Security scanning

### 7:00 PM: Documentation

In the final hours, I created comprehensive documentation:

1. A detailed README.md
2. Flow diagrams using Mermaid
3. Command reference
4. Known issues and future improvements

## Conclusion: Lessons Learned

![Success](https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80)

Completing this hackathon in just 72 hours taught me several valuable lessons:

1. **Planning is crucial**: The time I spent planning on Day 1 saved me countless hours later.

2. **Automate everything**: Every manual step is a potential point of failure.

3. **Test early and often**: Comprehensive testing caught issues before they became critical problems.

4. **Optimize for performance**: Small optimizations add up to significant improvements.

5. **Documentation matters**: Good documentation makes the project accessible and maintainable.

The most challenging aspects were:

- Setting up the CI/CD pipeline with proper caching and optimization
- Handling real-time updates efficiently with Socket.IO
- Ensuring the Docker build process was fast and reliable
- Managing concurrent operations without race conditions

Despite these challenges, I'm proud of what I accomplished in just three days. The resulting DevOps pipeline is robust, efficient, and ready for production use.

## What's Next?

While I'm satisfied with what I built in 72 hours, there are several improvements I'd like to make:

1. Replace the in-memory store with a persistent database
2. Add user authentication and authorization
3. Implement more comprehensive monitoring and alerting
4. Migrate from Docker Compose to Kubernetes for better scalability
5. Add feature flags for safer deployments

This hackathon was just the beginning of my DevOps journey, and I'm excited to continue improving and expanding on what I've built.

---

*Thank you for reading about my HackOps 2025 journey! If you have any questions or would like to see the code, check out the [GitHub repository](https://github.com/yourusername/hackops-2025).*