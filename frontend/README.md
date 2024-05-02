# Frontend

- [Frontend](#frontend)
  - [Tutorial](#tutorial)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Starting the Frontend Locally](#starting-the-frontend-locally)
    - [Run the Frontend via Docker](#run-the-frontend-via-docker)


## Tutorial

https://angular.io/tutorial/

## Requirements

- [Angular = 17.1.0](https://angular.io/guide/setup-local)
- [Node.js (LTS) >= 18.13](https://nodejs.org/en/download)
- TypeScript >= 5.2.0 < 5.4.0

## Installation

```bash
npm install
```

## Usage

### Starting the Frontend Locally
You can deploy a local version of the web application via Angular <br>
You can access the web application on [localhost:4200](http://localhost:4200):

``` bash
ng serve
```

### Run the Frontend via Docker
You can deploy a local version of the web application via docker. <br>
You can either build the docker container locally or download the latest build from the PDataViewer GitHub package registry.

``` bash
docker build . -t ghcr.io/scai-bio/pdataviewer/frontend:latest
docker pull ghcr.io/scai-bio/pdataviewer/frontend:latest
```

After build/download you will be able to start the container and access the PDataViewer web application per default on [localhost:8080](http://localhost:8080/):

``` bash
docker run -p 8080:80 ghcr.io/pdataviewer/scai-bio/frontend:latest
```