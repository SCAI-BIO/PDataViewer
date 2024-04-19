# Define the base image
FROM node:alpine

# Create a folder and copy the folder structure from local
WORKDIR /app
COPY . /app

# Install dependencies
RUN npm install -g @angular/cli
RUN npm install

EXPOSE 4200

CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
