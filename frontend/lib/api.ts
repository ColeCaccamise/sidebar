import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { cookies } from 'next/headers';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      maxRedirects: 0, // prevent auto redirects
    });
  }

  private setCookiesFromResponse(response: AxiosResponse): void {
    const setCookieHeader = response.headers['set-cookie'] as
      | string[]
      | undefined;
    if (!setCookieHeader) return;

    const cookieStore = cookies();

    setCookieHeader.forEach((cookie) => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=').split(';')[0];
      cookieStore.set(name, value);
    });
  }

  // attempt token refresh
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = cookies().get('refresh-token')?.value;
      if (!refreshToken) {
        return false;
      }

      const response = await this.client.get('/auth/refresh', {
        headers: {
          Cookie: `refresh-token=${refreshToken}`,
        },
        validateStatus: (status) => status < 400, // prevent redirect handling
      });

      if (response.headers['set-cookie']) {
        this.setCookiesFromResponse(response);
      }

      return true;
    } catch {
      return false;
    }
  }

  // get auth token from cookie in server action
  private getAuthToken(): string | undefined {
    const cookieStore = cookies();
    return cookieStore.get('auth-token')?.value;
  }

  // add auth token to request config
  private addAuthHeader(config: AxiosRequestConfig): AxiosRequestConfig {
    const token = this.getAuthToken();
    if (token) {
      return {
        ...config,
        headers: {
          ...config.headers,
          Cookie: `auth-token=${token}`,
        },
      };
    }
    return config;
  }

  // make request with automatic token refresh on 401
  private async request<T>(
    method: string,
    url: string,
    config: AxiosRequestConfig = {},
    data?: unknown, // allow any data type for multipart etc
  ): Promise<AxiosResponse<T>> {
    try {
      // attempt request with current token
      const response = await this.client({
        method,
        url,
        ...this.addAuthHeader(config),
        data,
      });
      return response;
    } catch (error: unknown) {
      // handle 401 by attempting refresh and retry
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error.response as { status?: number })?.status === 401
      ) {
        const refreshSuccess = await this.refreshToken();

        if (refreshSuccess) {
          // retry with new token
          return this.client({
            method,
            url,
            ...this.addAuthHeader(config),
            data,
          });
        }
      }

      throw error;
    }
  }

  // wrapper methods for axios with auth
  async get<T>(
    url: string,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.request<T>('get', url, config);
  }

  async post<T>(
    url: string,
    data?: unknown,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.request<T>('post', url, config, data);
  }

  async put<T>(
    url: string,
    data?: unknown,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.request<T>('put', url, config, data);
  }

  async delete<T>(
    url: string,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.request<T>('delete', url, config);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.request<T>('patch', url, config, data);
  }
}

// create singleton instance
const api = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
);

export default api;
