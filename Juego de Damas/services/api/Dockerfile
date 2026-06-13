FROM oven/bun:1.2
WORKDIR /app
COPY . .
RUN bun install
RUN bun run --cwd packages/shared-types build
CMD ["bun", "--cwd", "services/api", "run", "dev"]
