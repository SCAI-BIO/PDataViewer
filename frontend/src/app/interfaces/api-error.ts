export interface ApiError {
  error?: {
    message?: string;
    detail?: string;
  };
  message?: string;
}
