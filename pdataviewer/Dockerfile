# FIRST STAGE: Build the Angular Application
FROM node:20.12.2 as build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --loglevel verbose

# Install Angular CLI globally
RUN npm install -g @angular/cli

# Copy the rest of the application code to the working directory
COPY . ./

# Build the Angular application
RUN ng build --configuration=production

# SECOND STAGE: Serve the application using Nginx
FROM nginx:1.26.0

# Copy the built application from the previous stage
COPY --from=build app/dist/pdataviewer /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx serve
CMD ["nginx", "-g", "daemon off;"]
