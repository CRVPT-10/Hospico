import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../store/store";
import { login } from "../features/auth/authSlice";
import { Link, useNavigate } from "react-router-dom";
import type { RootState } from "../store/store";

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, isAuthenticated, error } = useSelector((s: RootState) => s.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-gray-100">
      <div className="flex w-ful bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Left marketing panel */}
        <div
          className="hidden md:flex flex-1 bg-cover bg-center items-center p-8 text-white relative"
          style={{
            backgroundImage: `url('/path/to/your/background-image.jpg')`, // Replace with your actual image path if needed
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
        <div className="w-full md:w-1/2 flex items-center justify-center sm:p-8">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-semibold mb-2 text-gray-900 text-center">
              Welcome!
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Please enter your email and password to continue
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <input
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
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

            <div className="flex items-center my-6">
              <hr className="flex-grow border-t border-gray-300" />
              <span className="px-3 text-gray-500 text-sm">
                Or sign in as
              </span>
              <hr className="flex-grow border-t border-gray-300" />
            </div>

            <div className="space-y-4">
              <Link
                to="/partner-login"
                className="w-full flex items-center justify-center p-3 rounded-md border border-gray-300 text-gray-800 font-medium hover:bg-gray-50 transition-colors"
              >
                Hospital Partner
                <span className="ml-auto text-xl">→</span>
              </Link>
              <button
                className="w-full flex items-center justify-between p-3 rounded-md border border-gray-300 text-gray-400 font-medium cursor-not-allowed"
                disabled
              >
                Doctor
                <span className="ml-auto text-sm">Coming Soon</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 text-center mt-6">
              <Link
                className="text-blue-600 hover:text-blue-700 font-medium"
                to="/signup"
              >
                New User? Signup!
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;