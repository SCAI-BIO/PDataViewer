FROM ghcr.io/astral-sh/uv:0.13.0-trixie-slim

WORKDIR /backend

ENV UV_NO_DEV=1 \
    UV_NO_CACHE=1 \
    UV_LINK_MODE=copy

RUN uv python install 3.15.0

COPY pyproject.toml uv.lock ./

RUN uv sync \
    --locked \
    --no-install-project

COPY src ./src
COPY README.md LICENSE ./

RUN uv sync \
    --locked \
    --no-editable

EXPOSE 80

# Define the command to run the API
CMD ["/backend/.venv/bin/uvicorn", "pdataviewer.api.main:app", "--host", "0.0.0.0", "--port", "80"]