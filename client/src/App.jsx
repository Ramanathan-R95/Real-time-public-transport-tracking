import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar          from './components/Navbar';
import HomePage        from './pages/HomePage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import DriverPage      from './pages/DriverPage';
import UserPage        from './pages/UserPage';
import RouteSetupPage  from './pages/RouteSetupPage';
import TripHistoryPage from './pages/TripHistoryPage';
import AdminLoginPage  from './pages/AdminLoginPage';
import AdminPage       from './pages/AdminPage';
import AboutPage       from './pages/AboutPage';

function PrivateRoute({ children }) {
  return localStorage.getItem('driver_token')
    ? children
    : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  return localStorage.getItem('admin_token')
    ? children
    : <Navigate to="/admin/login" replace />;
}

// Pages where the Navbar should NOT appear
const NO_NAV_PAGES = [
  '/driver/route-setup',
];

function Layout() {
  const location = useLocation();
  const showNav = !NO_NAV_PAGES.includes(location.pathname);

  return (
    <>
      {showNav && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/"                element={<HomePage />} />
        <Route path="/track"           element={<UserPage />} />
        <Route path="/about"           element={<AboutPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />

        {/* Driver */}
        <Route path="/driver"          element={<PrivateRoute><DriverPage /></PrivateRoute>} />
        <Route path="/driver/route-setup" element={<PrivateRoute><RouteSetupPage /></PrivateRoute>} />
        <Route path="/driver/history"  element={<PrivateRoute><TripHistoryPage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin/login"     element={<AdminLoginPage />} />
        <Route path="/admin"           element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}