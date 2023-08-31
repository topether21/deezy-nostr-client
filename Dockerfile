# Base image with Node LTS
FROM --platform=linux/amd64 node:lts AS base

# Installer stage to install Node dependencies
FROM base AS installer
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY pnpm-lock.yaml ./pnpm-lock.yaml
COPY package.json ./package.json
RUN pnpm install

# Copy application files and build
COPY . .
RUN pnpm run build

# Runner stage to run the application
FROM base AS runner
WORKDIR /app

# Copy built application from installer stage
COPY --from=installer /app .

CMD ["node", "dist/index.js"]
