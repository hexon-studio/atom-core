FROM node:22.13.1-alpine3.21 AS base

ENV PNPM_HOME="/pnpm"

ENV PATH="$PNPM_HOME:$PATH"

# System packages to build native libs
RUN apk add --no-cache python3 make g++

RUN npm install -g corepack@latest
RUN corepack enable

COPY . /app

WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN pnpm rebuild 

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:22.13.1-alpine3.21

WORKDIR /app

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json ./package.json

ENV NODE_ENV=production
RUN npm install -g /app


