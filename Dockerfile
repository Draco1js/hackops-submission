FROM node:23-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Add environment variables to prevent prompts, weeeirdass workaround
ENV CI=true
ENV ADBLOCK=true
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
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
COPY --from=builder /app/pnpm-lock.yaml /app/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod
EXPOSE 3001
CMD ["node", "/app/server/index.js"]
