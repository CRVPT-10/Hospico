import "./App.css";
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import FindHospitals from "./pages/FindHospitals";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSelector } from "react-redux";
import type { RootState } from "./store/store";
import { useAuthInitializer } from "./hooks/useAuthInitializer";
import FullScreenLoader from "./components/FullScreenLoader";
import PartnerLogin from "./pages/PartnerLogin";
import Emergency from "./pages/Emergency";
import HospitalProfile from "./pages/HospitalProfile";
import Profile from "./pages/Profile.tsx";

function App() {
  useAuthInitializer();

  const {
    initialized,
    // isAuthenticated
  } = useSelector((s: RootState) => s.auth);

  if (!initialized) {
    return <FullScreenLoader />;
  }

  return (
    <BrowserRouter>
      <div className="h-screen overflow-y-auto">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/partner-login" element={<PartnerLogin />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/find-hospitals"
            element={
              <ProtectedRoute>
                <FindHospitals />
              </ProtectedRoute>
            }
          />
          <Route path="/hospitals" element={<FindHospitals />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/find-hospital/:id" element={<HospitalProfile />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
