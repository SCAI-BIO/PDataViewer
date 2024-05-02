# Backend

- [Backend](#backend)
  - [Tutorial](#tutorial)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Starting the Backend Locally](#starting-the-backend-locally)
    - [Run the Backend via Docker](#run-the-backend-via-docker)


## Tutorial

https://fastapi.tiangolo.com/tutorial/

## Requirements

- Python >= 3.10

## Installation

```python
pip install -r requirements.txt
```

## Usage

### Starting the Backend Locally
You can access the backend functionalities by accessing the provided REST API. <br>
Run the Backend API on port 5000:

```python
uvicorn api.routes:app --reload -port 5000
```

### Run the Backend via Docker
The API can also be run via docker. <br>
You can either build the docker container locally or download the latest build from the PDataViewer GitHub package registry.

```bash
docker build . -t ghcr.io/scai-bio/pdataviewer/backend:latest
docker pull ghcr.io/scai-bio/pdataviewer/backend:latest
```

After build/download you will be able to start the container and access the PDataViewer API per default on [localhost:8000](http://localhost:8000/):

```bash
docker run -p 8000:80 ghcr.io/pdataviewer/scai-bio/backend:latest
```