# Backend

- [Backend](#backend)
  - [Introduction](#introduction)
  - [Tutorial](#tutorial)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Starting the Backend Locally](#starting-the-backend-locally)
    - [Run the Backend via Docker](#run-the-backend-via-docker)

## Introduction

This repository contains the backend code for the PDataViewer web application. It provides the API services necessary for interacting with the PD data landscape.

## Tutorial

For a detailed guide on using FastAPI, refer to the official [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)

## Requirements

- Python >= 3.10

## Installation

Install the project dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Starting the Backend Locally

You can access the backend functionalities by accessing the provided REST API.

Run the Backend API on port 5000:

```bash
uvicorn api.main:app --reload --port 5000
```

### Run the Backend via Docker

The API can also be run via docker.

You can either build the docker container locally or download the latest build from the PDataViewer GitHub package registry.

To build the Docker container locally:

```bash
docker build -t ghcr.io/scai-bio/pdataviewer/backend:latest .
```

To download the latest build:

```bash
docker pull ghcr.io/scai-bio/pdataviewer/backend:latest
```

After building or downloading, start the container and access the PDataViewer API by default on [localhost:8000](http://localhost:8000):

```bash
docker run -p 8000:80 ghcr.io/scai-bio/pdataviewer/backend:latest
```
