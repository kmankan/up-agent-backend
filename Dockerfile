FROM oven/bun:1.1.34

# Install required system dependencies
RUN apt-get update && apt-get install -y \
  libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy the rest of the application
COPY . .

# Start the application
CMD ["bun", "run", "index.ts"] 