import { HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Service()
export class ApiErrorHandler {
  private readonly snackBar = inject(MatSnackBar);

  handleError(err: unknown, context: string): string {
    const errorMessage = this.getErrorMessage(err);
    console.error(`[${context}]`, errorMessage, err);

    this.snackBar.open(errorMessage, 'Dismiss', {
      duration: 8000,
      panelClass: 'error-snackbar',
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });

    return errorMessage;
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'The request could not be completed. Please try again.';
      }

      const body: unknown = err.error;

      if (typeof body === 'object' && body !== null) {
        if ('detail' in body) {
          const detail: unknown = body.detail;

          if (typeof detail === 'string' && detail.trim()) {
            return detail.trim();
          }

          if (Array.isArray(detail)) {
            const messages = detail
              .map((issue: unknown): string => {
                if (
                  typeof issue === 'object' &&
                  issue !== null &&
                  'msg' in issue &&
                  typeof issue.msg === 'string'
                ) {
                  return issue.msg.trim();
                }
                return '';
              })
              .filter((message) => message.length > 0);

            if (messages.length > 0) {
              return messages.join('; ');
            }
          }
        }

        if ('message' in body && typeof body.message === 'string' && body.message.trim()) {
          return body.message.trim();
        }
      }

      return 'The request failed. Please try again.';
    }

    if (err instanceof Error && err.message.trim()) {
      return err.message.trim();
    }

    return 'An unexpected error occurred.';
  }
}
