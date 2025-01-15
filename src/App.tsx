// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import StaffDashboard from './components/StaffDashboard';
import ProfilePage from './components/ProfilePage';
import ReservationConfirmationPage from './components/ReservationConfirmationPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <NavBar />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Confirmation route (public) */}
        <Route path="/reservation-confirmation" element={<ReservationConfirmationPage />} />

        {/* Protected routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
