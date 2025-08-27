FROM python:3.12

WORKDIR /backend

COPY ./requirements.txt /backend/requirements.txt

RUN pip install -r /backend/requirements.txt

COPY . .

# Make port 80 available to the world outside this container
EXPOSE 80

# Define the command to run the API
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "80"]