# Backend Dockerfile for Express Server with Prisma
FROM node:20

# Create working directory
WORKDIR /app

# Enable Playwright headless running dependencies
# It is CRITICAL to include this exact installation to prevent Linux library errors in Chrome
RUN npm install -g pnpm && \
    npx playwright install --with-deps chromium

# Copy package files (package.json and package-lock.json if available)
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy Prisma schema and code directory
COPY prisma ./prisma/

# Generate Prisma client directly during the build phase
RUN npx prisma generate

# Copy the rest of the application files
COPY . .

# Expose the server port
EXPOSE 5000

# Start command
CMD ["npm", "start"]
