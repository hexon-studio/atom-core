FROM node:20-slim AS base

# Enable Corepack
RUN corepack enable
COPY . /app
WORKDIR /app

# Create a new image for production dependencies
FROM base as prod-deps
# Install production dependencies
# use a cache if available
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Create build image for building the TypeScript code
FROM base AS build
# Install build dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# Build the TypeScript
RUN pnpm run build

# Create an image base
FROM base
# Copy production dependencies from the prod-deps stage
COPY --from=prod-deps /app/node_modules /app/node_modules
# Copy the compiled TypeScript code from the build stage
COPY --from=build /app/dist /app/dist

# Start PNPM script
ENTRYPOINT ["node", "dist/cli.cjs"]
