import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import type { ApiError } from '@shared/interfaces/api-error';

@Injectable({
  providedIn: 'root',
})
export class ApiErrorHandler {
  private snackBar = inject(MatSnackBar);

  handleError(err: ApiError, context: string): string {
    const detail = err.error?.detail;
    const message = err.error?.message || err.message;
    const errorMessage =
      detail && message
        ? `${message} — ${detail}`
        : detail || message || 'An unknown error occurred.';

    console.error(`[${context}]`, errorMessage, err);

    this.snackBar.open(errorMessage, 'Dismiss', {
      duration: 8000,
      panelClass: 'error-snackbar',
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });

    return errorMessage;
  }
}
