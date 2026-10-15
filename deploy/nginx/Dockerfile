# syntax=docker/dockerfile:1.7
# =============================================================================
# Imagen "web": compila el frontend (React/Vite) y lo sirve con Nginx, que además
# hace de proxy inverso hacia el backend y termina TLS.
# Contexto de construcción: la RAÍZ del repositorio (ver deploy/docker-compose.prod.yml).
# =============================================================================

# ---------- Etapa 1: compilar el frontend ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./

# Variables de compilación (Vite las incrusta en el JavaScript; no ponga secretos aquí).
ARG SITE_URL=https://wexperiencias.example.cl
ARG VITE_API_URL=/api/v1
ARG VITE_TILE_URL=
ARG VITE_TILE_ATTRIBUTION=
ARG VITE_MAP_EXTRA_STYLES=false
ENV SITE_URL=$SITE_URL \
    VITE_API_URL=$VITE_API_URL \
    VITE_TILE_URL=$VITE_TILE_URL \
    VITE_TILE_ATTRIBUTION=$VITE_TILE_ATTRIBUTION \
    VITE_MAP_EXTRA_STYLES=$VITE_MAP_EXTRA_STYLES
RUN npm run build

# ---------- Etapa 2: Nginx ----------
FROM nginx:1.28-alpine AS runtime
# Solo se sustituye ${DOMAIN} en las plantillas (el resto de $variables son de Nginx).
ENV NGINX_ENVSUBST_FILTER=^DOMAIN$
RUN rm -f /etc/nginx/conf.d/default.conf
COPY deploy/nginx/snippets/ /etc/nginx/snippets/
COPY deploy/nginx/templates/ /etc/nginx/templates/
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/nginx-health || exit 1
