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
    });
  }

  // get auth token from cookie in server action
  private getAuthToken(): string | undefined {
    const cookieStore = cookies();
    return cookieStore.get('auth-token')?.value;
  }

  // add auth token to request config
  private addAuthHeader(config: AxiosRequestConfig): AxiosRequestConfig {
    const token = this.getAuthToken();
    console.log('auth token', token);
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

  // wrapper methods for axios with auth
  async get<T>(
    url: string,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.client.get(url, this.addAuthHeader(config));
  }

  async post<T>(
    url: string,
    data?: any,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, this.addAuthHeader(config));
  }

  async put<T>(
    url: string,
    data?: any,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, this.addAuthHeader(config));
  }

  async delete<T>(
    url: string,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.client.delete(url, this.addAuthHeader(config));
  }

  async patch<T>(
    url: string,
    data?: any,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, this.addAuthHeader(config));
  }
}

// create singleton instance
const api = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
);

export default api;
