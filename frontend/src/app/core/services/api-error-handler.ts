import { Injectable } from '@angular/core';

import type { ApiError } from '@shared/interfaces/api-error';

@Injectable({
  providedIn: 'root',
})
export class ApiErrorHandler {
  handleError(err: ApiError, context: string): string {
    console.error(`Error ${context}:`, err);

    const detail = err.error?.detail;
    const message = err.error?.message || err.message;
    const errorMessage =
      detail && message
        ? `${message} — ${detail}`
        : detail || message || 'An unknown error occurred.';

    alert(`An error occurred while fetching data: ${errorMessage}`);

    return errorMessage;
  }
}
