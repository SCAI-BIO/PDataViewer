# Define the base image
FROM python:3.12

# Create a folder and copy the folder structure from local
RUN mkdir -p /api
RUN mkdir -p /cdm
RUN mkdir -p /functions

COPY /api /api
COPY /cdm /cdm
COPY /functions /functions

# Install API requirements
COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt

EXPOSE 80

# API entry point
CMD ["uvicorn", "api.routes:app", "--host", "0.0.0.0", "--port", "80"]