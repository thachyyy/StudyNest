import { auth } from '../lib/firebase.ts';

export class ApiError extends Error {
  public status: number;
  public data: any;
  public isUnauthorized: boolean;
  public isForbidden: boolean;
  public isNotFound: boolean;
  public isConflict: boolean;
  public isServerError: boolean;
  public isNetworkError: boolean;

  constructor(message: string, status: number = 0, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
    this.isNotFound = status === 404;
    this.isConflict = status === 409;
    this.isServerError = status >= 500;
    this.isNetworkError = status === 0 || !status;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

export interface RequestOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
  signal?: AbortSignal;
}

export interface RequestConfig extends RequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: any;
}

// Optional custom token provider for testing or custom session contexts
let customTokenProvider: (() => Promise<string | null>) | null = null;

export function setCustomTokenProvider(provider: (() => Promise<string | null>) | null) {
  customTokenProvider = provider;
}

/**
 * Resolves current Firebase ID token.
 * Waits for auth state resolution if Firebase Auth is initializing.
 */
export async function getFirebaseToken(): Promise<string | null> {
  if (customTokenProvider) {
    return await customTokenProvider();
  }

  if (!auth) return null;
  try {
    // If Firebase Auth is still initializing, wait for it to be ready
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.warn('Failed to retrieve Firebase ID token:', error);
    return null;
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // If endpoint already starts with baseUrl (e.g. '/api/classes'), don't duplicate
    if (cleanEndpoint.startsWith(this.baseUrl)) {
      return cleanEndpoint;
    }
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  async request<T = any>(endpoint: string, config: RequestConfig): Promise<T> {
    const url = this.buildUrl(endpoint);
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...config.headers,
    };

    // Attach Authorization header if not skipped
    if (!config.skipAuth) {
      // If authorization header was not manually provided in config.headers, resolve token
      if (!headers['Authorization']) {
        const token = await getFirebaseToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
    }

    const fetchOptions: RequestInit = {
      method: config.method,
      headers,
      signal: config.signal,
    };

    if (config.body !== undefined && config.body !== null) {
      if (typeof config.body === 'object' && !(config.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(config.body);
      } else {
        fetchOptions.body = config.body;
      }
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (networkErr: any) {
      throw new ApiError(
        networkErr?.message || 'Network connection failed. Please check your internet connection.',
        0,
        networkErr
      );
    }

    // Attempt to parse JSON response
    let responseData: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (parseErr) {
        responseData = null;
      }
    } else {
      try {
        responseData = await response.text();
      } catch {
        responseData = null;
      }
    }

    if (!response.ok) {
      const errorMessage =
        (typeof responseData === 'object' && responseData !== null
          ? responseData.error || responseData.message
          : responseData) ||
        `Request failed with status ${response.status} (${response.statusText})`;

      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData as T;
  }

  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  async post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, ...options });
  }

  async patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, ...options });
  }

  async put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, ...options });
  }

  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }
}

export const apiClient = new ApiClient('/api');

