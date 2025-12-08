import DomainAddIcon from "@mui/icons-material/DomainAdd";
import { useState } from "react";
import { useAppDispatch } from "../store/store";
import { partnerLogin } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";

const PartnerLogin = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handlePartnerLogin = async () => {
    const resultAction = await dispatch(partnerLogin({ email, password }));

    if (partnerLogin.fulfilled.match(resultAction)) {
      navigate("/");
    }
  };

  const handleGoogleLogin = async () => {
    window.location.href = `${API_BASE_URL}/api/v1/auth/partner/google`;
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <DomainAddIcon className="text-blue-600 text-5xl" fontSize="large" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-center mb-2">
          Partner with Us
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Access your dashboard, manage slots, and grow your digital footprint
        </p>

        {/* Google Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleGoogleLogin();
          }}
          className="w-full border rounded-lg border-gray-300 hover:bg-gray-100 flex items-center justify-center gap-2 mb-4 p-2"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-5 w-5"
          />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-3 text-sm text-gray-500">Or continue with</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Email/Password Inputs */}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handlePartnerLogin();
          }}
        >
          <input
            type="email"
            placeholder="Email address"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
            Sign in
          </button>
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          New to our platform?{" "}
          <a href="#" className="text-blue-600 hover:underline font-medium">
            Request onboarding →
          </a>
        </p>
      </div>
    </div>
  );
};

export default PartnerLogin;
