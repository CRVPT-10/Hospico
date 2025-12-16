import "./App.css";
import { useEffect } from "react";
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import MyAppointments from "./pages/MyAppointments";
import MedicalReports from "./pages/MedicalReports";

import { ThemeProvider } from "./context/ThemeContext";

function App() {
  useAuthInitializer();

  function TitleUpdater() {
    const location = useLocation();

    useEffect(() => {
      const path = location.pathname;
      const titleMap: { [key: string]: string } = {
        '/': 'Dashboard - HospiCo',
        '/dashboard': 'Dashboard - HospiCo',
        '/find-hospitals': 'Find Hospitals - HospiCo',
        '/hospitals': 'Find Hospitals - HospiCo',
        '/emergency': 'Emergency - HospiCo',
        '/login': 'Login - HospiCo',
        '/signup': 'Sign Up - HospiCo',
        '/partner-login': 'Partner Login - HospiCo',
        '/profile': 'My Profile - HospiCo',
        '/my-appointments': 'My Appointments - HospiCo',
        '/resources': 'Resources - HospiCo',
      };

      // dynamic routes handling
      let title = titleMap[path];
      if (!title) {
        if (path.startsWith('/find-hospital')) title = 'Hospital Profile - HospiCo';
        else title = 'HospiCo';
      }

      document.title = title;
    }, [location]);

    return null;
  }

  const {
    initialized,
    // isAuthenticated
  } = useSelector((s: RootState) => s.auth);

  if (!initialized) {
    return <FullScreenLoader />;
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <TitleUpdater />
        <div className="h-screen overflow-y-auto bg-white dark:bg-slate-900 transition-colors duration-200">
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
            <Route path="/find-hospitals" element={<FindHospitals />} />
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
            <Route
              path="/my-appointments"
              element={
                <ProtectedRoute>
                  <MyAppointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <MedicalReports />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
