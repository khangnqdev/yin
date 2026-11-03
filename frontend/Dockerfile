# ==============================================================================
# YIN FRONTEND - MULTI-STAGE DOCKERFILE
# Stage 1: Build Angular app
# Stage 2: Serve with Nginx
# ==============================================================================

FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration=production

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

