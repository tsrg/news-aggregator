# Admin (Vite build → nginx)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve with nginx
FROM nginx:alpine AS runner
RUN apk add --no-cache dumb-init
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["dumb-init", "nginx", "-g", "daemon off;"]
