# user-service/Dockerfile

# 1) Build stage
FROM node:20-alpine AS build
WORKDIR /app
# Faster layer caching: install deps first
COPY package*.json ./
RUN npm ci
# Copy source and build
COPY . .
RUN npx prisma generate  # if using Prisma
RUN npm run build   # should output to dist/

# 2) Runtime stage
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# The port Nest listens on (default 3000)
ENV PORT=4001
EXPOSE 4001

# Start Nest (compiled)
CMD ["node", "dist/main.js"]