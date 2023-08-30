# Base image with Node LTS
FROM --platform=linux/amd64 node:lts AS base

# Builder stage for installing dependencies and other operations
FROM base AS builder

# Set working directory
WORKDIR /app
RUN pnpm install -g pnpm
COPY . .
# Optional: Run any pruning or other build steps here, for example:
# RUN pnpm prune --production

# Installer stage to install Node dependencies
FROM base AS installer
WORKDIR /app

# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/package.json ./package.json
RUN pnpm install

# Copy application files and build
COPY --from=builder /app .
# Uncomment to set any environment variables for build, for example:
# ENV NODE_ENV=production

RUN pnpm run build --filter deezy-nostr-client

# Runner stage to run the application
FROM base AS runner
WORKDIR /app

# Uncomment to set non-root user for security
# RUN addgroup --system --gid 1001 prod
# RUN adduser --system --uid 1001 prod
# USER prod

# Copy built application from installer stage
COPY --from=installer /app .

CMD ["node", "apps/deezy-nostr-client/dist/"]
