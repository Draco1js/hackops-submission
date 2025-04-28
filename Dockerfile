FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install pnpm
RUN npm install -g pnpm@8.15.4

# Copy source code
COPY . .

# Install dependencies with aggressive retry settings
RUN pnpm config set network-timeout 300000 && \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-mintimeout 20000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm install --no-frozen-lockfile --network-concurrency=1 || \
    (sleep 5 && pnpm install --no-frozen-lockfile --network-concurrency=1) || \
    (sleep 10 && pnpm install --no-frozen-lockfile --network-concurrency=1)

# Build the application
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
EXPOSE 3001
CMD ["node", "/app/server/index.js"]
