const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error("VITE_API_URL is not configured");
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getErrorMessage(body: unknown, status: number): string {
  const fallback = `Request failed (HTTP ${status})`;

  if (typeof body !== "object" || body === null) {
    return fallback;
  }

  if ("detail" in body) {
    const detail = body.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((issue: unknown) => {
          if (
            typeof issue === "object" &&
            issue !== null &&
            "msg" in issue &&
            typeof issue.msg === "string"
          ) {
            return issue.msg.trim();
          }

          return "";
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
  }

  if (
    "message" in body &&
    typeof body.message === "string" &&
    body.message.trim()
  ) {
    return body.message.trim();
  }

  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, "")}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    throw new ApiError(response.status, getErrorMessage(body, response.status));
  }

  if (response.status === 204) {
    throw new Error(
      "Expected a JSON response, but the server returned HTTP 204.",
    );
  }

  const payload: unknown = await response.json();

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return payload as T;
}

type RequestOptions = Omit<RequestInit, "method" | "body">;

export const api = {
  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return request<T>(path, {
      ...options,
      method: "GET",
    });
  },

  post<T>(
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    return request<T>(path, {
      ...options,
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  },
};
