# Stage 1: Build the application
FROM node:18-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files first for caching layer
COPY package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build Tailwind CSS (adjust as per your script)
RUN npm run build:css

# Stage 2: Create the production image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install ClamAV and LibreOffice
# The package name for headless LibreOffice on Debian is 'libreoffice'
RUN apt-get update && apt-get install -y --no-install-recommends \
    clamav \
    clamav-daemon \
    libreoffice \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app .

# Expose app port
EXPOSE 3001

# Run freshclam to update virus definitions on container start
# Start clamd in background and run node server
CMD ["/bin/sh", "-c", "freshclam && clamd & node server.js"]
