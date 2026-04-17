export interface ApiError {
  readonly error?: {
    readonly message?: string;
    readonly detail?: string;
  };
  readonly message?: string;
}
