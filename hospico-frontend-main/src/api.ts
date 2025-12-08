import axios, { AxiosError, type Method } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"; // Updated to match backend

// Function to get JWT token from localStorage or cookies
const getAuthToken = (): string | null => {
  // First try to get from localStorage
  const token = localStorage.getItem('jwt_token');
  if (token) {
    return token;
  }
  
  // If not in localStorage, try to get from cookies
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'jwt_token') {
      return value;
    }
  }
  
  return null;
};

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  method: Method = "GET",
  body?: TBody
): Promise<TResponse> {
  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if token is available
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios.request<TResponse>({
      baseURL: API_BASE_URL,
      url: path,
      method,
      data: body,
      headers,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    const err = error as AxiosError<{ message?: string } | string>;
    const message =
      (typeof err.response?.data === "string"
        ? err.response?.data
        : (err.response?.data as { message?: string })?.message) ||
      err.message ||
      "Request failed";
    throw new Error(message);
  }
}

export { API_BASE_URL };