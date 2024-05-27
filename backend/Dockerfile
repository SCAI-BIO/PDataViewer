# Define the base image
FROM python:3.12

# Create a folder and copy the folder structure from local
RUN mkdir -p /app

WORKDIR /app

COPY /api /app/api
COPY /cdm /app/cdm
COPY /functions /app/functions

# Install API requirements
COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt

# Set PYTHONPATH to include the directories with local modules
ENV PYTHONPATH="/app:/app/api:/app/functions"

EXPOSE 80

# API entry point
CMD ["uvicorn", "api.routes:app", "--host", "0.0.0.0", "--port", "80"]