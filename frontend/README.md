# PDataViewer Frontend

The React frontend for PDataViewer, a web application that helps researchers explore Parkinson's disease cohort datasets, compare variable availability, and identify studies suited to their research needs.

## Introduction

PDataViewer provides interactive tools for exploring the Parkinson's disease data landscape:

- **Cohorts:** Compare study characteristics, participant counts, and data-access information.
- **Biomarkers:** Explore biomarker distributions across cohorts and diagnosis groups.
- **Study Picker:** Rank cohorts by the availability of selected variables.
- **Mappings:** Visualize semantic relationships between variables across cohort studies.
- **Longitudinal:** Explore measurement availability across follow-up visits.
- **Contact Us:** Find information about the PDataViewer team.

The frontend communicates with the PDataViewer FastAPI backend.

## Technology Stack

- [React](https://react.dev/) with TypeScript
- [Vite](https://vite.dev/) for development and production builds
- [React Router](https://reactrouter.com/) with `HashRouter` for client-side navigation
- [Tailwind CSS](https://tailwindcss.com/) and locally maintained UI components based on [Base UI](https://base-ui.com/) and shadcn/ui patterns
- [TanStack Query](https://tanstack.com/query/latest) for API requests and caching
- [TanStack Table](https://tanstack.com/table/latest) for data tables
- [Apache ECharts](https://echarts.apache.org/) and [D3](https://d3js.org/) for visualizations
- [Vitest](https://vitest.dev/) for testing
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) for linting

## Requirements

- [Node.js](https://nodejs.org/) 26 recommended; see the `engines` field in `package.json` for other supported versions
- npm
- A running PDataViewer FastAPI backend for data-dependent features
- Docker (optional, for containerized deployment)

Project dependencies are installed locally with npm. No global React or Vite installation is required.

## Installation

Clone the repository, navigate to the frontend directory, and install dependencies from the lockfile:

```bash
git clone https://github.com/SCAI-BIO/PDataViewer.git
cd PDataViewer/frontend
npm ci
```

When modifying dependencies, use `npm install` and commit the updated `package.json` and `package-lock.json`.

## Configuration

The frontend uses one Vite build-time variable:

| Variable | Required for production Docker build | Description |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Browser-accessible base URL of the PDataViewer API |

### Local development

Create an `.env.local` file in the frontend project root:

```dotenv
VITE_API_URL=/api
```

When the development proxy is configured in `vite.config.ts`, requests to `/api` are forwarded to the local backend (by default, `http://localhost:5000`). Start FastAPI on that port before using data-dependent features.

If supported by your `vite.config.ts`, `API_PROXY_TARGET` can override the development proxy target:

```dotenv
API_PROXY_TARGET=http://localhost:5000
```

`API_PROXY_TARGET` is a Vite development-server setting, not a variable exposed to browser code by the `VITE_*` convention.

### Google Analytics

The GA4 measurement ID is currently configured directly in `src/lib/analytics.ts`; **`VITE_GA_MEASUREMENT_ID` is not required**.

The analytics consent provider controls when Google's script is loaded and tracks React Router page views after permission has been granted. The measurement ID is public, but analytics credentials must never be embedded into frontend code.

**Development note:** With a hardcoded, valid measurement ID, accepting analytics during local development may send actual events. Use a deliberate development-only exclusion or a separate GA4 property if development traffic must be excluded.

### Production configuration

GitHub Actions supplies the public `VITE_API_URL` repository variable to Docker through a build argument:

```yaml
build-args: |
  VITE_API_URL=${{ vars.VITE_API_URL }}
```

Vite embeds `VITE_*` values into the JavaScript bundle at build time. These values are publicly accessible and must not contain credentials or secrets. Setting an environment variable in the running Nginx container does not change an already compiled API URL.

**Important:** The Vite development proxy does not run in the production Nginx image. A production build with `VITE_API_URL=/api` needs an Nginx, ingress, or other reverse proxy that routes `/api` to the backend. Otherwise, provide an absolute browser-accessible API URL.

## Usage

### Start the frontend locally

```bash
npm run dev
```

By default, Vite serves the application at [http://localhost:5173](http://localhost:5173), with hot module replacement.

### Build for production

Run TypeScript checks and create the optimized static build:

```bash
npm run build
```

`build` runs `tsc -b && vite build`. The output is written to `dist/`.

Preview that output locally:

```bash
npm run preview
```

The preview server is intended for verification, not production hosting.

## Docker

The production image uses a multistage build: Node.js installs dependencies and runs Vite; Nginx serves the generated static files.

### Build the production image

From `frontend/`, for a local backend reachable from the browser on port 8000:

```bash
docker build \
  -f Dockerfile.prod \
  --build-arg VITE_API_URL=http://localhost:8000 \
  -t pdataviewer-frontend:local \
  .
```

Or from PowerShell:

```powershell
docker build `
  -f Dockerfile.prod `
  --build-arg VITE_API_URL=http://localhost:8000 `
  -t pdataviewer-frontend:local `
  .
```

Change the API URL to match the environment. Because the browser sends the API requests, `localhost` refers to the browser user's machine, **not** the frontend container. When using an absolute API URL on a separate origin, add the frontend origin to the backend's CORS configuration.

### Run the production container

```bash
docker run --rm -p 8080:80 pdataviewer-frontend:local
```

Open [http://localhost:8080](http://localhost:8080). Nginx serves the React application on container port 80.

### Development container

If `Dockerfile.dev` is configured for the React/Vite development server, it can be built with:

```bash
docker build -f Dockerfile.dev -t pdataviewer-frontend:dev .
```

The container configuration must expose the Vite port (typically 5173) and bind Vite to `0.0.0.0` for host access. For hot reload, mount the source directory and keep container-installed `node_modules` on a separate volume.

When the backend runs in another Compose service, configure the development proxy to target that service name instead of `localhost`.

## Development Checks

Run all frontend checks with the same command intended for CI:

```bash
npm run check
```

This executes the following checks in order:

1. `npm run lint:ci` — Oxlint with warnings treated as errors.
2. `npm run test:run` — Vitest in non-watch mode.
3. `npm run build` — TypeScript project build followed by the Vite production build.

Individual commands are also available:

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run Oxlint |
| `npm run lint:fix` | Apply available automatic lint fixes |
| `npm run typecheck` | Run `tsc -b` |
| `npm run test` | Start Vitest in development mode |
| `npm run test:run` | Run Vitest once |
| `npm run build` | Type-check and build production assets |

## Application Structure

The frontend uses a feature-oriented architecture:

```text
src/
├── app/
│   ├── layouts/
│   └── router.tsx
├── components/
│   ├── feedback/
│   ├── forms/
│   ├── layout/
│   ├── privacy/
│   └── ui/
├── features/
│   ├── biomarkers/
│   ├── cohorts/
│   ├── contact-us/
│   ├── home/
│   ├── longitudinal/
│   ├── mappings/
│   └── study-picker/
├── hooks/
├── lib/
├── index.css
└── main.tsx
```

Pages and feature-specific components live in `features/`; shared UI components, API utilities, and reusable hooks are organized outside those directories.

## Deployment

Production images are built in CI and deployed with Docker, Kubernetes, and Helm. The release workflow supplies `VITE_API_URL` at **build time**, and the Nginx image serves the generated static files.

Different API URLs require separate production builds unless runtime frontend configuration is implemented. Ingress and backend routing must be configured separately from the Vite development proxy.

## Further Resources

- [React Documentation](https://react.dev/learn)
- [Vite Documentation](https://vite.dev/guide/)
- [PDataViewer Repository](https://github.com/SCAI-BIO/PDataViewer)
- [PDataViewer Documentation](https://github.com/SCAI-BIO/PDataViewer/wiki)
