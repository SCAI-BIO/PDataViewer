# Frontend

- [Frontend](#frontend)
  - [Introduction](#introduction)
  - [Tutorial](#tutorial)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Starting the Frontend Locally](#starting-the-frontend-locally)
    - [Run the Frontend via Docker](#run-the-frontend-via-docker)

## Introduction

This repository contains the frontend code for the PDataViewer web application. It allows users to explore the PD data landscape and identify cohort datasets that suit their research needs.

## Tutorial

For a detailed guide on using Angular, refer to the official [Angular Tutorial](https://angular.dev/tutorials).

## Requirements

- [Angular == 19.x.x](https://angular.dev/installation)
- [Node.js >= 18.19.1](https://nodejs.org/en/download/package-manager)
- TypeScript >= 5.5.0

## Installation

Install the project dependencies:

```bash
npm install
```

## Usage

### Starting the Frontend Locally

You can deploy a local version of the web application via Angular

You can access the web application on [localhost:4200](http://localhost:4200):

```bash
ng serve
```

### Run the Frontend via Docker

You can deploy a local version of the web application via docker.

You can either build the docker container locally or download the latest build from the PDataViewer GitHub package registry.

To build the Docker container locally:

```bash
docker build -t ghcr.io/scai-bio/pdataviewer/frontend:latest .
```

To download the latest build:

```bash
docker pull ghcr.io/scai-bio/pdataviewer/frontend:latest
```

After build/download you will be able to start the container and access the PDataViewer web application per default on [localhost:8080](http://localhost:8080/):

```bash
docker run -p 8080:80 ghcr.io/scai-bio/pdataviewer/frontend:latest
```
