import axios, { AxiosError, type Method } from "axios";

const API_BASE_URL =
  import.meta.env.REACT_APP_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

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
  body?: TBody
): Promise<TResponse> {
  try {
    const response = await apiClient.request<TResponse>({
      url: path,
      method,
      data: body,
    });
    return response.data;
  } catch (error) {
    const err = error as AxiosError<{ message?: string } | string>;
    
    // More detailed error handling
    let message = "Request failed";
    
    if (err.response) {
      // Server responded with error status
      switch (err.response.status) {
        case 400:
          message = "Bad Request - Please check your input";
          break;
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

// Trigger redeploy
export { API_BASE_URL };