# Use an official, lightweight Node.js active LTS image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first
# This allows Docker to cache the dependencies installation step
COPY package*.json ./

# Upgrade OS packages to patch libcrypto, libssl, and zlib CVEs
RUN apk update && apk upgrade --no-cache

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application files
COPY . .

# Expose the port the Express server relies on (we set it to 4000 earlier)
EXPOSE 4000

# Optional: Ensure the server creates a scores.json if it doesn't map a volume
# It is recommended to mount this file as a Docker volume in production so scores persist!
ENV PORT=4000

# Command to run the application securely
CMD ["node", "server.js"]
