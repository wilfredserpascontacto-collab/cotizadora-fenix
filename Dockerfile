# Compilacion de la PWA y servido estatico. Es lo que Coolify necesita.
FROM node:22-alpine AS build
WORKDIR /app

# Dependencias primero: la capa se reutiliza mientras no cambie el lockfile.
COPY package*.json ./
RUN npm ci

COPY . .

# Ruta base configurable. Raiz del dominio por defecto.
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# Chequeo simple para que Coolify sepa cuando el contenedor esta listo.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
