FROM node:20-alpine AS base
WORKDIR /app
# We need devDependencies for building
ENV NODE_ENV=development
# Skip husky installation in Docker
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
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm install --force --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Set production environment for final images
ENV NODE_ENV=production

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
EXPOSE 3001
CMD ["node", "/app/server/index.js"]
