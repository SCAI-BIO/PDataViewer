# Use an official Python runtime as a parent image
FROM python:3.11

# Set the working directory in the container
WORKDIR /app

# Copy the necessary directories into the container
COPY api /app/api
COPY functions /app/functions
COPY repository /app/repository

# Copy the requirements.txt file and install any dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r /app/requirements.txt

# Set the PYTHONPATH environemnt variable to include the app directories
ENV PYTHONPATH="/app:/app/api:/app/functions:/app/repository"

# Make port 80 available to the world outside this container
EXPOSE 80

# Define the command to run the API
CMD ["uvicorn", "api.routes:app", "--host", "0.0.0.0", "--port", "80"]