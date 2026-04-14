import axios, { AxiosError, type Method } from "axios";

// Prefer env override in hosted envs; fall back to same-origin proxy
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const usesApiPrefixBase = API_BASE_URL === "/api" || API_BASE_URL.endsWith("/api");

const normalizeRequestPath = (path: string) => {
  if (!path) return path;
  const trimmed = path.trim();
  if (usesApiPrefixBase && trimmed.startsWith("/api/")) {
    return trimmed.slice(4);
  }
  return trimmed;
};

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

type ApiRequestOptions = {
  cacheTtlMs?: number;
  cacheKey?: string;
  bypassCache?: boolean;
};

const API_CACHE_PREFIX = "hospiico_api_cache:";
const memoryCache = new Map<string, CacheEntry>();

const isBrowser = typeof window !== "undefined";

const buildCacheKey = (method: Method, path: string, customCacheKey?: string) => {
  if (customCacheKey && customCacheKey.trim()) {
    return `${API_CACHE_PREFIX}${customCacheKey.trim()}`;
  }
  return `${API_CACHE_PREFIX}${String(method).toUpperCase()}:${normalizeRequestPath(path)}`;
};

const readCache = <T>(key: string): T | null => {
  const now = Date.now();

  const memory = memoryCache.get(key);
  if (memory) {
    if (memory.expiresAt > now) {
      return memory.data as T;
    }
    memoryCache.delete(key);
  }

  if (!isBrowser) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.expiresAt !== "number") {
      window.sessionStorage.removeItem(key);
      return null;
    }
    if (parsed.expiresAt <= now) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    memoryCache.set(key, parsed);
    return parsed.data as T;
  } catch {
    return null;
  }
};

const writeCache = (key: string, value: unknown, ttlMs: number) => {
  const entry: CacheEntry = {
    data: value,
    expiresAt: Date.now() + ttlMs,
  };

  memoryCache.set(key, entry);

  if (!isBrowser) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage quota and serialization issues.
  }
};

// Create an axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to handle authentication
apiClient.interceptors.request.use(
  (config) => {
    if (typeof config.url === "string") {
      config.url = normalizeRequestPath(config.url);
    }

    // Let browser/axios set multipart boundary automatically for FormData
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }

    // Get JWT token from localStorage
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  method: Method = "GET",
  body?: TBody,
  options?: ApiRequestOptions
): Promise<TResponse> {
  try {
    const requestMethod = String(method).toUpperCase() as Method;
    const normalizedPath = normalizeRequestPath(path);
    const cacheTtlMs = options?.cacheTtlMs ?? 0;
    const shouldUseCache = requestMethod === "GET" && cacheTtlMs > 0 && !options?.bypassCache;
    const cacheKey = shouldUseCache
      ? buildCacheKey(requestMethod, normalizedPath, options?.cacheKey)
      : null;

    if (cacheKey) {
      const cached = readCache<TResponse>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient.request<TResponse>({
      url: normalizedPath,
      method: requestMethod,
      data: body,
    });

    if (cacheKey) {
      writeCache(cacheKey, response.data, cacheTtlMs);
    }

    return response.data;
  } catch (error) {
    const err = error as AxiosError<{ message?: string } | string>;

    // More detailed error handling
    let message = "Request failed";

    if (err.response) {
      // Server responded with error status
      switch (err.response.status) {
        case 400: {
          // If server provided a specific message, prefer it for clarity
          const serverMsg = typeof err.response.data === 'string'
            ? err.response.data
            : (err.response.data as { message?: string })?.message;

          if (serverMsg) {
            const lower = serverMsg.toLowerCase();
            // Common backend message for duplicate email/check
            if (lower.includes('email') && (lower.includes('exist') || lower.includes('already') || lower.includes('registered'))) {
              message = 'Email Already Registered. Please login.';
            } else {
              message = serverMsg as string;
            }
          } else {
            message = "Bad Request - Please check your input";
          }
          break;
        }
        case 401:
          message = "Unauthorized - Please check your credentials";
          break;
        case 403:
          message = "Forbidden - Access denied";
          break;
        case 404:
          message = "Not Found - Resource not found";
          break;
        case 500:
          message = "Internal Server Error - Please try again later";
          break;
        default:
          message = typeof err.response.data === "string"
            ? err.response.data
            : (err.response.data as { message?: string })?.message || "Server Error";
      }
    } else if (err.request) {
      // Request was made but no response received
      message = "Network Error - Please check your connection";
    } else {
      // Something else happened
      message = err.message || "Unknown Error";
    }

    throw new Error(message);
  }
}

export const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await apiClient.get(normalizeRequestPath(url), { responseType: 'blob' });
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download file');
  }
};

export { API_BASE_URL, apiClient };