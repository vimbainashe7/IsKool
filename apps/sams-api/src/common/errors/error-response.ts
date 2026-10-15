export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    status: number;
    requestId: string;
  };
}
