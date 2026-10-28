# ---- Stage 1: build the React app with Vite ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Optional build-time variable (Darwinbox SSO); empty keeps the SSO button disabled
ARG VITE_DARWINBOX_SSO_URL=""
ENV VITE_DARWINBOX_SSO_URL=$VITE_DARWINBOX_SSO_URL

RUN npm run build

# ---- Stage 2: serve static files + reverse proxy /api with Nginx ----
FROM nginx:1.27-alpine

# Replace the default site with ours
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
