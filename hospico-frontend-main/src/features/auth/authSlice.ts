import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { apiRequest } from "../../api";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthState = {
  user: AuthUser | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
};

type Credentials = { email: string; password: string };
type SignupPayload = { email: string; password: string; name?: string };
// Updated AuthResponse type to match backend response
export type AuthResponse = {
  success: boolean;
  message: string;
  id: number;
  email: string;
  name: string;
  role: string;
  token: string;
};

export const login = createAsyncThunk<AuthResponse, Credentials>(
  "auth/login",
  async (body, { rejectWithValue }) => {
    try {
      const result = await apiRequest<AuthResponse, Credentials>(
        "http://localhost:8080/api/auth/login",
        "POST",
        body
      );

      return result;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const signup = createAsyncThunk<AuthResponse, SignupPayload>(
  "auth/signup",
  async (body, { rejectWithValue }) => {
    try {
      const result = await apiRequest<AuthResponse, SignupPayload>(
        "http://localhost:8080/api/auth/signup",
        "POST",
        body
      );

      return result;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const fetchMe = createAsyncThunk<AuthUser>(
  "api/v1/auth/me",
  async (_, { rejectWithValue }) => {
    try {
      // This endpoint checks JWT validity from cookie
      const result = await apiRequest<AuthUser>("api/v1/auth/me", "GET");
      return result;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const partnerLogin = createAsyncThunk<AuthResponse, Credentials>(
  "api/v1/auth/partner/login",
  async (body, { rejectWithValue }) => {
    try {
      const result = await apiRequest<AuthResponse, Credentials>(
        "api/v1/auth/partner/login",
        "POST",
        body
      );

      return result;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const partnerGoogleLogin = createAsyncThunk<AuthResponse>(
  "api/v1/auth/partner/google",
  async (_body, { rejectWithValue }) => {
    try {
      const result = await apiRequest<AuthResponse>(
        "api/v1/auth/partner/google",
        "GET"
      );

      return result;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const logout = createAsyncThunk<void, void>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      // Clear cookies by setting them to expire in the past
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      document.cookie = "user_info=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      // Also clear localStorage
      localStorage.removeItem('jwt_token');
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
  isAuthenticated: false,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // LOGIN
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.initialized = false;
        state.error = null;
      })
      .addCase(
        login.fulfilled,
        (state, action: PayloadAction<AuthResponse>) => {
          state.status = "succeeded";
          if (action.payload && action.payload.id) {
            state.user = {
              id: action.payload.id.toString(),
              email: action.payload.email,
            };
          }
          // Store the JWT token in localStorage
          if (action.payload && action.payload.token) {
            localStorage.setItem('jwt_token', action.payload.token);
          }
          state.isAuthenticated = true;
          state.initialized = true;
        }
      )
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          (action.payload as string) ?? action.error.message ?? "Login failed";
        state.isAuthenticated = false;
        state.initialized = true;
      });

    // SIGNUP
    builder
      .addCase(signup.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.initialized = false;
      })
      .addCase(
        signup.fulfilled,
        (state, action: PayloadAction<AuthResponse>) => {
          state.status = "succeeded";
          if (action.payload && action.payload.id) {
            state.user = {
              id: action.payload.id.toString(),
              email: action.payload.email,
            };
          }
          // Store the JWT token in localStorage
          if (action.payload && action.payload.token) {
            localStorage.setItem('jwt_token', action.payload.token);
          }
          state.isAuthenticated = true;
          state.initialized = true;
        }
      )
      .addCase(signup.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          (action.payload as string) ?? action.error.message ?? "Signup failed";
        state.isAuthenticated = false;
        state.initialized = true;
      });

    // FETCH ME
    builder
      .addCase(fetchMe.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.status = "failed";
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
        state.error =
          (action.payload as string) ?? "Failed to fetch user session";
      });

    // LOGOUT
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = "idle";
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Logout failed";
      });
  },
});

export default authSlice.reducer;
