import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../store/store";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { googleLogin, login } from "../features/auth/authSlice";
import { Link, useNavigate } from "react-router-dom";
import type { RootState } from "../store/store";
import { apiRequest } from "../api";

type ProfileCompletionResponse = {
  phone?: string;
  age?: number;
  gender?: string;
};

type ProfileCompletionPayload = {
  phone: string;
  age: number;
  gender: string;
};

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, isAuthenticated, error } = useSelector((s: RootState) => s.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [completionPhone, setCompletionPhone] = useState("");
  const [completionAge, setCompletionAge] = useState("");
  const [completionGender, setCompletionGender] = useState("");
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionSaving, setCompletionSaving] = useState(false);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const resultAction = await dispatch(login({ email, password }));

    if (login.fulfilled.match(resultAction)) {
      navigate("/dashboard"); // Redirect to dashboard
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      return;
    }

    const resultAction = await dispatch(
      googleLogin({ idToken: credentialResponse.credential })
    );

    if (googleLogin.fulfilled.match(resultAction)) {
      try {
        const profile = await apiRequest<ProfileCompletionResponse>("/api/users/me", "GET");
        const phone = (profile.phone ?? "").trim();
        const isPlaceholderPhone = phone === "9999999999";
        const needsProfileCompletion = !phone || isPlaceholderPhone || !profile.age || !profile.gender;

        if (needsProfileCompletion) {
          setCompletionPhone(isPlaceholderPhone ? "" : phone);
          setCompletionAge(profile.age ? String(profile.age) : "");
          setCompletionGender(profile.gender ?? "");
          setCompletionError(null);
          setShowProfileCompletion(true);
          return;
        }
      } catch {
        // Fall back to dashboard if profile fetch fails after successful auth.
      }

      navigate("/dashboard");
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!completionPhone.trim()) {
      setCompletionError("Phone number is required.");
      return;
    }

    if (!completionAge || Number(completionAge) <= 0) {
      setCompletionError("Please enter a valid age.");
      return;
    }

    if (!completionGender) {
      setCompletionError("Please select your gender.");
      return;
    }

    try {
      setCompletionSaving(true);
      setCompletionError(null);

      const payload: ProfileCompletionPayload = {
        phone: completionPhone.trim(),
        age: Number(completionAge),
        gender: completionGender,
      };

      await apiRequest("/api/users/me", "PATCH", payload);
      setShowProfileCompletion(false);
      navigate("/dashboard");
    } catch (err) {
      setCompletionError((err as Error).message || "Failed to save profile details.");
    } finally {
      setCompletionSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-3 py-4 sm:px-4 bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="flex w-full max-w-6xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200/70 dark:border-slate-700 transition-colors duration-200">
        {/* Left marketing panel */}
        <div
          className="hidden md:flex flex-1 bg-cover bg-center items-center p-8 text-white relative"
          style={{
            backgroundImage: `url('/src/assets/images/hospital-login-bg.jpg')`, // Updated with a placeholder path or keep dynamic if needed
          }}
        >
          {/* Overlay to darken image for better text readability */}
          <div className="absolute inset-0 bg-blue-900 opacity-80 z-0"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-4">
              A Smarter Way to Access Healthcare
            </h1>
            <p className="text-lg">
              Revolutionizing healthcare accessibility by instantly connecting
              patients to trusted hospitals and clinics around them.
            </p>
          </div>
        </div>

        {/* Right login form panel */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white text-center">
              Welcome!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-5 text-center text-sm sm:text-base">
              Please enter your email and password to continue
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
              <input
                className="w-full px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="submit"
                className="w-full px-4 py-3 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors text-base flex items-center justify-center"
                disabled={!email || !password || status === "loading"}
              >
                {status === "loading" ? "Logging in..." : "Continue →"}
              </button>
            </form>

            <div className="my-4 sm:my-5 flex justify-center">
              {googleClientId ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    // Keep UI stable and surface backend/frontend auth errors through Redux state.
                  }}
                  text="continue_with"
                  width="320"
                />
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                  Google login is not configured. Set VITE_GOOGLE_CLIENT_ID.
                </p>
              )}
            </div>

            <div className="flex items-center my-6">
              <hr className="flex-grow border-t border-gray-300 dark:border-gray-600" />
              <span className="px-3 text-gray-500 dark:text-gray-400 text-sm">
                Or sign in as
              </span>
              <hr className="flex-grow border-t border-gray-300 dark:border-gray-600" />
            </div>

            <div className="space-y-3 sm:space-y-4">
              <Link
                to="/partner-login"
                className="w-full flex items-center justify-center p-3.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Hospital Partner
                <span className="ml-auto text-xl">→</span>
              </Link>
              <Link
                to="/doctor-login"
                className="w-full flex items-center justify-center p-3.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Doctor
                <span className="ml-auto text-xl">→</span>
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center mt-6">
              <Link
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                to="/signup"
              >
                New User? Signup!
              </Link>
            </p>
          </div>
        </div>
      </div>

      {showProfileCompletion && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Complete Your Profile</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 mb-4">
              Please add your phone, age, and gender to continue.
            </p>

            {completionError && (
              <div className="mb-3 p-2.5 text-sm rounded-md border border-red-200 bg-red-50 text-red-700">
                {completionError}
              </div>
            )}

            <form onSubmit={handleCompleteProfile} className="space-y-3">
              <input
                type="text"
                value={completionPhone}
                onChange={(e) => setCompletionPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                min={1}
                value={completionAge}
                onChange={(e) => setCompletionAge(e.target.value)}
                placeholder="Age"
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={completionGender}
                onChange={(e) => setCompletionGender(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <button
                type="submit"
                disabled={completionSaving}
                className="w-full px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium"
              >
                {completionSaving ? "Saving..." : "Save and Continue"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;