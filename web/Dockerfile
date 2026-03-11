# Frontend Next.js Dockerfile
FROM node:20

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Pass the API URL as a build arg if Next.js statically builds
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js application
RUN npm run build

# Expose the frontend port
EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "start"]
