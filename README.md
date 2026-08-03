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

PDataViewer is a web application that lets you explore the PD data landscape and identify cohort datasets that suit your research needs.

- [PDataViewer](#pdataviewer)
  - [Introduction](#introduction)
  - [Requirements](#requirements)
  - [Installation](#installation)
    - [Clone the Repository](#clone-the-repository)
    - [Install the Backend Dependencies](#install-the-backend-dependencies)
    - [Install the Frontend Dependencies](#install-the-frontend-dependencies)
  - [Usage](#usage)
    - [Run the Backend Locally](#run-the-backend-locally)
    - [Run the Backend via Docker](#run-the-backend-via-docker)
    - [Run the Frontend Locally](#run-the-frontend-locally)
    - [Run the Frontend via Docker](#run-the-frontend-via-docker)
    - [Run both the Frontend and Backend via Docker](#run-both-the-frontend-and-backend-via-docker)
  - [Development Checks](#development-checks)
    - [Frontend Linting](#frontend-linting)
    - [Frontend Tests](#frontend-tests)
    - [Backend Linting](#backend-linting)
  - [Published Container Images](#published-container-images)

## Introduction

Data collected in cohort studies lay the groundwork for a plethora of Parkinson’s disease (PD) research endeavors. PDataViewer lets you explore this PD data landscape and identify cohort datasets that suit your research needs. We accessed and curated major PD cohort datasets in a purely data-driven manner with the aim of:

1. characterizing their underlying data
2. assessing the quantity and availability of data
3. evaluating the interoperability across these distinct cohort datasets.

## Requirements

For local development:

- [Python](https://www.python.org/) >=3.14, <3.15
- Install [uv](https://docs.astral.sh/uv/getting-started/installation/) before installing the backend dependencies.
- [Node.js](https://nodejs.org/) 26
- npm
- Git

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

Please consult [uv documentation](https://docs.astral.sh/uv/getting-started/installation/#__tabbed_1_1) for uv package manager installation.

```bash
cd backend
uv sync --locked
```

### Install the Frontend Dependencies

Install Node.js 26 and then run:

```bash
cd frontend
npm ci
```

## Usage

### Run the Backend Locally

Start the backend API on port 5000:

```bash
cd backend
uv run uvicorn api.main:app --reload --port 5000
```

### Run the Backend via Docker

From the repository root, build the backend image:

```bash
docker build \
   -f backend/Dockerfile \
   -t pdataviewer-backend:local \
   backend
```

Start the container:

```bash
docker run --rm -p 8000:80 pdataviewer-backend:local
```

The API will be available at [localhost:8000](http://localhost:8000).

### Run the Frontend Locally

You can deploy a local version of the web application via Angular CLI.

You can access the web application on [localhost:4200](http://localhost:4200):

```bash
cd frontend
npm start
```

### Run the Frontend via Docker

To build the Docker container locally:

```bash
docker build \
   -f frontend/Dockerfile.prod \
   -t pdataviewer-frontend:local \
   frontend
```

Start the container:

```bash
docker run --rm -p 8080:80 pdataviewer-frontend:local
```

The application will be available at [localhost:8080](http://localhost:8080).

### Run both the Frontend and Backend via Docker

You can deploy a local version of the API and the web application together.

1. **Ensure Docker Compose is Installed**:
   Make sure you have Docker Compose installed on your machine. You can verify this by running:

   ```bash
   docker compose --version
   ```

2. Navigate to the repository root.
3. Build and start the containers:

   ```bash
   docker compose up --build
   ```

4. Verify that the containers are running:

   ```bash
   docker compose ps
   ```

This command lists all running containers.

You can access the web application on [localhost:3000](http://localhost:3000) and the API on [localhost:5000](http://localhost:5000).

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

```bash
cd backend

uv run flake8 api database preprocessing \
   --count \
   --select=E9,F63,F7,F82 \
   --show-source \
   --statistics

uv run flake8 api database preprocessing \
   --count \
   --exit-zero \
   --max-complexity=10 \
   --max-line-length=127 \
   --statistics
```

## Published Container Images

Release images are published to GitHub Container Registry:

```text
ghcr.io/scai-bio/pdataviewer/frontend:<version>
ghcr.io/scai-bio/pdataviewer/backend:<version>
```

For example:

```bash
docker pull ghcr.io/scai-bio/pdataviewer/frontend:0.4.2
docker pull ghcr.io/scai-bio/pdataviewer/backend:0.4.2
```

Stable releases are also available with the `latest` tag.
