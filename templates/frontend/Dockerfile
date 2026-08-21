# Frontend Dockerfile (M13.13 / M9.x deployment)
# Multi-stage build: node build → nginx serve
# Usage:
#   docker build -f Dockerfile -t agent-builder-frontend .
#   docker run -p 8080:80 agent-builder-frontend

# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (leverage Docker layer caching)
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Build the app
COPY . .
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Proxy API requests to the backend (M9.x service wiring)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
