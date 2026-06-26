FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/node_modules ./node_modules
COPY index.js ./
COPY proxy ./proxy
COPY musictag ./musictag
COPY qrcode ./qrcode
USER appuser
EXPOSE 7529
ENV NODE_ENV=production
CMD ["node", "index.js"]
