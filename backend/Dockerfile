FROM astral/uv:python3.14-trixie

WORKDIR /backend

COPY . /backend/

RUN uv sync --no-dev --no-cache
# Make port 80 available to the world outside this container
EXPOSE 80

# Define the command to run the API
CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "80"]