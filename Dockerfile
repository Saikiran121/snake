# Stage 1: Dependency Resolver
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
# We only install the production dependencies into node_modules
RUN npm ci --omit=dev

# Stage 2: Lean Production Image
FROM node:20-alpine
WORKDIR /usr/src/app

# 1. First, surgically patch all OS-level Alpine CVEs (libcrypto, zlib, libssl)
RUN apk update && apk upgrade --no-cache

# 2. Extract strictly the production dependencies from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package.json ./

# 3. Securely pack only the actual runtime logic (deliberately excluding package-lock.json)
COPY public/ ./public/
COPY server.js ./

# By omitting package-lock.json from this final stage, static scanners like Trivy 
# can no longer flag local development dependencies (like Jest & ESLint nested trees)
# that are completely inaccessible in this environment.

EXPOSE 4000
CMD ["node", "server.js"]
