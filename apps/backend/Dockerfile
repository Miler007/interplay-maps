FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspace config
COPY package*.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY apps/backend/package.json apps/backend/

# Install dependencies (cached layer)
RUN npm ci

# Copy source code
COPY packages/shared packages/shared
COPY packages/database packages/database
COPY apps/backend apps/backend

# Build shared package
RUN cd packages/shared && npm run build

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build backend
RUN cd apps/backend && npm run build

# --- Production image ---
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/database packages/database
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/package.json apps/backend/

# Prisma schema for runtime migrations
COPY --from=build /app/packages/database/prisma packages/database/prisma

EXPOSE 4000

COPY apps/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "apps/backend/dist/main"]
