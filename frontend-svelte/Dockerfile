FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# SvelteKit node adapter output
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Install only production deps needed by the node adapter
RUN npm install --omit=dev --ignore-scripts

EXPOSE 3001

# PORT is read by the node adapter at runtime
ENV PORT=3001

CMD ["node", "build"]
