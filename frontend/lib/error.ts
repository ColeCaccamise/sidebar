import { AxiosError } from 'axios';
import { ApiResponse } from '@/types';

export function handleApiError(error: unknown): ApiResponse {
  if (error instanceof AxiosError) {
    return error.response?.data as ApiResponse;
  }

  return {
    success: false,
    code: 'internal_server_error',
    message: 'An unexpected error occurred.',
  } as ApiResponse;
}
