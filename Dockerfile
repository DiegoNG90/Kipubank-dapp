FROM node:22.23.4-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./

# Railway injects NODE_ENV=production while building the image. Without
# --include=dev, npm ci skips TypeScript and Tailwind and `next build` fails.
RUN npm ci --include=dev

COPY . .

# Next inlines NEXT_PUBLIC_* when it builds the client bundle. Railway
# passes service variables into Docker as build args, and Docker only
# exposes an arg that the Dockerfile declares. Railpack injected them
# as a normal environment, so this step was unnecessary there.
ARG NEXT_PUBLIC_KIPUBANK_ADDRESS
ARG NEXT_PUBLIC_SEPOLIA_RPC_URL
ARG NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK
ENV NEXT_PUBLIC_KIPUBANK_ADDRESS=$NEXT_PUBLIC_KIPUBANK_ADDRESS
ENV NEXT_PUBLIC_SEPOLIA_RPC_URL=$NEXT_PUBLIC_SEPOLIA_RPC_URL
ENV NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK=$NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK

ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]
