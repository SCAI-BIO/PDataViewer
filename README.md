# PDataViewer

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./frontend/public/logos/logo_white.svg">
  <source media="(prefers-color-scheme: light)" srcset="./frontend/public/logos/logo.svg">
  <img src="./frontend/public/logos/logo.svg" width="100" alt="PDataViewer logo">
</picture>

[![Backend linting](https://github.com/SCAI-BIO/PDataViewer/actions/workflows/backend-linting.yml/badge.svg?branch=main)](https://github.com/SCAI-BIO/PDataViewer/actions/workflows/backend-linting.yml)
[![Frontend linting](https://github.com/SCAI-BIO/PDataViewer/actions/workflows/frontend-linting.yml/badge.svg?branch=main)](https://github.com/SCAI-BIO/PDataViewer/actions/workflows/frontend-linting.yml)
[![Frontend tests](https://github.com/SCAI-BIO/PDataViewer/actions/workflows/frontend-tests.yml/badge.svg?branch=main)](https://github.com/SCAI-BIO/PDataViewer/actions/workflows/frontend-tests.yml)
[![Version](https://img.shields.io/github/v/release/SCAI-BIO/PDataViewer)](https://github.com/SCAI-BIO/PDataViewer/releases)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![DOI](https://zenodo.org/badge/785700235.svg)](https://zenodo.org/doi/10.5281/zenodo.13629127)

PDataViewer is a web application that lets users explore the Parkinson’s disease data landscape and identify cohort datasets suited to their research needs.

- [PDataViewer](#pdataviewer)
  - [Introduction](#introduction)
  - [Project Structure](#project-structure)
  - [Requirements](#requirements)
  - [Installation](#installation)
    - [Clone the Repository](#clone-the-repository)
    - [Install the Backend Dependencies](#install-the-backend-dependencies)
    - [Install the Frontend Dependencies](#install-the-frontend-dependencies)
  - [Backend Configuration](#backend-configuration)
  - [Usage](#usage)
    - [Run the Backend Locally](#run-the-backend-locally)
    - [Run Backend Preprocessing](#run-backend-preprocessing)
    - [Run the Backend via Docker](#run-the-backend-via-docker)
    - [Run the Frontend Locally](#run-the-frontend-locally)
    - [Run the Frontend via Docker](#run-the-frontend-via-docker)
    - [Run the Frontend and Backend via Docker Compose](#run-the-frontend-and-backend-via-docker-compose)
  - [Development Checks](#development-checks)
    - [Frontend Linting](#frontend-linting)
    - [Frontend Tests](#frontend-tests)
    - [Backend Linting](#backend-linting)
    - [Backend Compilation Check](#backend-compilation-check)
  - [Published Container Images](#published-container-images)

## Introduction

Data collected in cohort studies lay the groundwork for a wide range of Parkinson’s disease research. PDataViewer provides an overview of this data landscape and helps researchers identify cohort datasets suited to their research questions.

Major Parkinson’s disease cohort datasets were accessed and curated in a data-driven manner with the aim of:

1. Characterizing their underlying data.
2. Assessing the quantity and availability of data.
3. Evaluating interoperability across distinct cohort datasets.

## Project Structure

The repository contains an Angular frontend, a FastAPI backend, and supporting deployment files.

```text
PDataViewer/
├── backend/
│   ├── src/
│   │   └── pdataviewer/
│   │       ├── api/
│   │       │   ├── dependencies/
│   │       │   ├── routers/
│   │       │   ├── services/
│   │       │   ├── tasks/
│   │       │   ├── config.py
│   │       │   ├── main.py
│   │       │   ├── schemas.py
│   │       │   └── upload_utils.py
│   │       ├── database/
│   │       │   ├── models/
│   │       │   ├── repositories/
│   │       │   ├── administration.py
│   │       │   ├── import_utils.py
│   │       │   └── typeddicts.py
│   │       └── preprocessing/
│   │           ├── biomarkers.py
│   │           ├── common.py
│   │           └── longitudinal.py
│   ├── data/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/
│   ├── public/
│   ├── src/
│   │   └── app/
│   │       ├── core/
│   │       ├── features/
│   │       └── shared/
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   └── package.json
├── docker-compose.yml
└── README.md
```

The running backend application is located under:

```text
backend/src/pdataviewer/api/
```

Database models and repositories are located under:

```text
backend/src/pdataviewer/database/
```

The preprocessing package is an offline workflow used to generate biomarker and longitudinal import files. It is not part of the running API.

## Requirements

For local development:

- [Python](https://www.python.org/) >=3.14, <3.15
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- [Node.js](https://nodejs.org/) 26
- npm
- Git
- PostgreSQL 18
- A compatible Keycloak instance for authenticated endpoints

For containerized deployment:

- Docker
- Docker Compose

## Installation

### Clone the Repository

```bash
git clone https://github.com/SCAI-BIO/PDataViewer
cd PDataViewer
```

### Install the Backend Dependencies

Consult the [uv installation documentation](https://docs.astral.sh/uv/getting-started/installation/) before installing the backend dependencies.

From the repository root:

```bash
cd backend
uv sync --locked
```

This creates a virtual environment and installs the PDataViewer backend package and its development dependencies from `uv.lock`.

### Install the Frontend Dependencies

Install Node.js 26 and then run:

```bash
cd frontend
npm ci
```

## Backend Configuration

The backend reads configuration from environment variables. For local development, create a `.env` file inside the `backend` directory.

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

Do not commit `.env` files. Environment-specific values should be supplied through local environment variables, Docker, Docker Compose, Kubernetes, or Helm.

## Usage

### Run the Backend Locally

Start the backend API on port 5000:

```bash
cd backend
uv run uvicorn pdataviewer.api.main:app --reload --port 5000
```

The API is available at:

```text
http://localhost:5000
```

Swagger documentation is available at:

```text
http://localhost:5000/docs
```

The current API version is available at:

```text
http://localhost:5000/version
```

The application creates missing database tables during startup. Existing database schema changes require an explicit migration or manual schema recreation.

### Run Backend Preprocessing

The preprocessing pipelines generate files that can subsequently be imported through the backend API.

Run biomarker preprocessing:

```bash
cd backend
uv run python -m pdataviewer.preprocessing.biomarkers
```

Run longitudinal preprocessing:

```bash
cd backend
uv run python -m pdataviewer.preprocessing.longitudinal
```

By default, the preprocessing pipelines read and write data under:

```text
backend/data/
```

Patient-level source data and generated processed files are excluded from the production backend image.

### Run the Backend via Docker

From the repository root, build the backend image:

```bash
docker build \
  -f backend/Dockerfile \
  -t pdataviewer-backend:local \
  backend
```

On PowerShell:

```powershell
docker build `
  -f backend/Dockerfile `
  -t pdataviewer-backend:local `
  backend
```

Start the container with the backend environment file:

```bash
docker run --rm \
  --name pdataviewer-backend \
  --env-file backend/.env \
  -p 8000:80 \
  pdataviewer-backend:local
```

On PowerShell:

```powershell
docker run --rm `
  --name pdataviewer-backend `
  --env-file backend/.env `
  -p 8000:80 `
  pdataviewer-backend:local
```

The API is available at [localhost:8000](http://localhost:8000), with Swagger documentation at [localhost:8000/docs](http://localhost:8000/docs).

Inside a container, `localhost` refers to the container itself. When PostgreSQL runs directly on the host machine, use:

```dotenv
POSTGRES_HOST=host.docker.internal
```

When PostgreSQL runs in another container on the same Docker network, use its container or service name:

```dotenv
POSTGRES_HOST=pdataviewer-postgres
```

For example:

```bash
docker network create pdataviewer

docker network connect \
  pdataviewer \
  pdataviewer-postgres

docker run --rm \
  --name pdataviewer-backend \
  --network pdataviewer \
  --env-file backend/.env \
  -e POSTGRES_HOST=pdataviewer-postgres \
  -p 8000:80 \
  pdataviewer-backend:local
```

### Run the Frontend Locally

Start the Angular development server:

```bash
cd frontend
npm start
```

The web application is available at [localhost:4200](http://localhost:4200).

### Run the Frontend via Docker

From the repository root, build the production frontend image:

```bash
docker build \
  -f frontend/Dockerfile.prod \
  -t pdataviewer-frontend:local \
  frontend
```

On PowerShell:

```powershell
docker build `
  -f frontend/Dockerfile.prod `
  -t pdataviewer-frontend:local `
  frontend
```

Start the container:

```bash
docker run --rm \
  --name pdataviewer-frontend \
  -p 8080:80 \
  pdataviewer-frontend:local
```

The application is available at [localhost:8080](http://localhost:8080).

### Run the Frontend and Backend via Docker Compose

The API and web application can be deployed together with Docker Compose.

Verify that Docker Compose is installed:

```bash
docker compose version
```

From the repository root, build and start the services:

```bash
docker compose up --build
```

Verify that the containers are running:

```bash
docker compose ps
```

The ports exposed by Docker Compose are defined in `docker-compose.yml`. In the default local configuration, the web application and API are available through their configured frontend and backend ports.

Stop the services with:

```bash
docker compose down
```

## Development Checks

### Frontend Linting

```bash
cd frontend
npm run lint
```

### Frontend Tests

```bash
cd frontend
npm test -- --watch=false
```

### Backend Linting

The backend uses Ruff for linting.

```bash
cd backend
uv run ruff check .
```

Apply safe automatic fixes:

```bash
uv run ruff check . --fix
```

Display linting statistics:

```bash
uv run ruff check . --statistics
```

### Backend Compilation Check

Verify that all backend Python modules compile:

```bash
cd backend
uv run python -m compileall src
```

The backend package can also be built locally:

```bash
cd backend
uv build
```

Build artifacts are created under:

```text
backend/dist/
```

## Published Container Images

Release images are published to the GitHub Container Registry:

```text
ghcr.io/scai-bio/pdataviewer/frontend:<version>
ghcr.io/scai-bio/pdataviewer/backend:<version>
```

For example:

```bash
docker pull ghcr.io/scai-bio/pdataviewer/frontend:<version>
docker pull ghcr.io/scai-bio/pdataviewer/backend:<version>
```

Run the published backend image with an environment file:

```bash
docker run --rm \
  --name pdataviewer-backend \
  --env-file backend/.env \
  -p 8000:80 \
  ghcr.io/scai-bio/pdataviewer/backend:<version>
```

Stable releases may also be published with the `latest` tag:

```bash
docker pull ghcr.io/scai-bio/pdataviewer/frontend:latest
docker pull ghcr.io/scai-bio/pdataviewer/backend:latest
```
