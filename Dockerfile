FROM node:20-alpine AS base
# Set environment variables to ensure non-interactive mode
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
ENV NODE_ENV=production
# Use a specific version of pnpm
RUN npm install -g pnpm@8.15.4

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
# Install dependencies without frozen-lockfile flag
RUN pnpm install
# Then copy the rest of the code
COPY . .
RUN pnpm build

FROM base AS client
WORKDIR /app
COPY --from=builder /app/packages/client/dist /app/client
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "/app/client", "-l", "3000"]

FROM base AS server
WORKDIR /app
COPY --from=builder /app/packages/server/dist /app/server
COPY --from=builder /app/packages/server/package.json /app/
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/
# Install production dependencies without frozen-lockfile flag
RUN pnpm install --prod
EXPOSE 3001
CMD ["node", "/app/server/index.js"]
