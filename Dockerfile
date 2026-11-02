FROM node:22.23.4-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./

# Railway injects NODE_ENV=production while building the image. Without
# --include=dev, npm ci skips TypeScript and Tailwind and `next build` fails.
RUN npm ci --include=dev

COPY . .

ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]
