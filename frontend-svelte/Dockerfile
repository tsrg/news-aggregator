FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm ci --prefer-offline --no-audit --no-fund

COPY . .
RUN npm run build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# SvelteKit node adapter output
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Install only production deps needed by the node adapter
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm install --omit=dev --ignore-scripts --no-audit --no-fund

EXPOSE 3001

# PORT is read by the node adapter at runtime
ENV PORT=3001

CMD ["node", "build"]
