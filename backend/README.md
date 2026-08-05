# Backend

- [Backend](#backend)
  - [Introduction](#introduction)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Usage](#usage)
    - [Starting the Backend Locally](#starting-the-backend-locally)
    - [Running Code Quality Checks](#running-code-quality-checks)
    - [Running Preprocessing](#running-preprocessing)
    - [Running the Backend via Docker](#running-the-backend-via-docker)
      - [Build the image locally](#build-the-image-locally)
      - [Connecting from Docker to PostgreSQL](#connecting-from-docker-to-postgresql)
      - [Pull the published image](#pull-the-published-image)

## Introduction

This directory contains the backend of the PDataViewer web application.

The backend provides:

- A FastAPI REST API.
- PostgreSQL-backed cohort, concept, mapping, longitudinal, and biomarker data access.
- CSV and ZIP-based database imports.
- Offline preprocessing pipelines for biomarker and longitudinal source data.

The importable Python package is located under:

```text
src/pdataviewer/
```

## Requirements

- Python 3.14
- [uv](https://docs.astral.sh/uv/)
- PostgreSQL 18
- Docker, when running the application as a container

## Installation

Run the following command from the `backend` directory:

```bash
uv sync
```

This creates the local virtual environment and installs the project and its development dependencies from `uv.lock`.

## Configuration

The application reads its configuration from environment variables. For local development, create a `.env` file in the `backend` directory.

Example:

```dotenv
POSTGRES_USER=testuser
POSTGRES_PASSWORD=testpass
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=testdb

KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=myrealm
KEYCLOAK_CLIENT_ID=pdataviewer-api

ALLOWED_ORIGINS='["http://localhost:4200"]'
```

`ALLOWED_ORIGINS` must be a valid JSON array of origin strings.

Do not commit the `.env` file. Environment-specific values should be provided through local environment variables, Docker, Docker Compose, Kubernetes, or Helm.

## Usage

### Starting the Backend Locally

Start the FastAPI application on port 5000:

```bash
uv run uvicorn pdataviewer.api.main:app --reload --port 5000
```

The API is then available at:

```text
http://localhost:5000
```

Swagger documentation:

```text
http://localhost:5000/docs
```

Current API version:

```text
http://localhost:5000/version
```

The application creates missing database tables during startup. Existing database schema changes still require a proper migration or manual schema recreation.

### Running Code Quality Checks

Run Ruff:

```bash
uv run ruff check .
```

Apply safe automatic fixes:

```bash
uv run ruff check . --fix
```

Verify that the Python modules compile:

```bash
uv run python -m compileall src
```

### Running Preprocessing

The preprocessing pipelines generate the files used by the application import workflow.

Run the biomarker preprocessing pipeline:

```bash
uv run python -m pdataviewer.preprocessing.biomarkers
```

Run the longitudinal preprocessing pipeline:

```bash
uv run python -m pdataviewer.preprocessing.longitudinal
```

By default, preprocessing reads and writes data under:

```text
backend/data/
```

The raw participant-level and generated processed data are not included in the production Docker image.

### Running the Backend via Docker

The API can be built locally or downloaded from the PDataViewer GitHub Container Registry.

#### Build the image locally

Run from the `backend` directory:

```bash
docker build -t pdataviewer-backend:local .
```

Start the locally built image with the environment variables from `.env`:

```bash
docker run --rm \
  --name pdataviewer-backend \
  --env-file .env \
  -p 8000:80 \
  pdataviewer-backend:local
```

On PowerShell:

```powershell
docker run --rm `
  --name pdataviewer-backend `
  --env-file .env `
  -p 8000:80 `
  pdataviewer-backend:local
```

The API is then available at:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

#### Connecting from Docker to PostgreSQL

Inside a container, `localhost` refers to the container itself.

When PostgreSQL runs directly on the host machine, use:

```dotenv
POSTGRES_HOST=host.docker.internal
```

When PostgreSQL runs in another container on the same Docker network, use the PostgreSQL container or service name:

```dotenv
POSTGRES_HOST=pdataviewer-postgres
```

For example:

```powershell
docker network create pdataviewer

docker network connect pdataviewer pdataviewer-postgres

docker run --rm `
  --name pdataviewer-backend `
  --network pdataviewer `
  --env-file .env `
  -e POSTGRES_HOST=pdataviewer-postgres `
  -p 8000:80 `
  pdataviewer-backend:local
```

#### Pull the published image

```bash
docker pull ghcr.io/scai-bio/pdataviewer/backend:latest
```

Run the published image:

```bash
docker run --rm \
  --name pdataviewer-backend \
  --env-file .env \
  -p 8000:80 \
  ghcr.io/scai-bio/pdataviewer/backend:latest
```
