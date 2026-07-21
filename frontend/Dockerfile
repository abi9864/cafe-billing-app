FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Baked in at build time — Vite embeds import.meta.env.VITE_API_URL into the
# compiled JS, so this must be passed as --build-arg at `docker build` time,
# not set later as a runtime env var (that would have no effect on a
# pre-built static bundle).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
