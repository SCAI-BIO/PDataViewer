# FIRST STAGE
# Define the base image
FROM node:20.12.2 as build

# Create a folder, and copy package.json and package-lock.json to it
WORKDIR /app
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --loglevel verbose

# Install Angular
RUN npm install -g @angular/cli

# Copy all the files in the current directory to the container
COPY . ./

# Build the Angular application
RUN ng build --configuration=production

# SECOND STAGE
# Define the base image
FROM nginx:latest

COPY --from=build app/dist/browser /usr/share/nginx/html

EXPOSE 80
