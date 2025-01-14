import React from 'react';
import ReservationForm from './ReservationForm';
import StaffBanner from './StaffBanner';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=120"
                alt="Rotary Sushi Logo"
                className="h-8 w-8 rounded-full"
              />
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-600">
                    Welcome, {user.name || user.email}
                  </span>
                  {user.role === 'staff' || user.role === 'admin' ? (
                    <Link
                      to="/dashboard"
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Dashboard
                    </Link>
                  ) : null}
                  <button
                    onClick={() => logout()}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div 
        className="relative bg-cover bg-center h-[500px]"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1920")',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col items-center justify-center text-center">
          <img
            src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=120"
            alt="Rotary Sushi Logo"
            className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-6"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Welcome to Rotary Sushi
          </h1>
          <p className="text-xl text-white mb-8">
            Experience the finest conveyor belt sushi in town
          </p>
        </div>
      </div>

      {/* Reservation Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Make a Reservation</h2>
          <p className="mt-2 text-gray-600">
            Book your seat at our conveyor belt for a unique dining experience
          </p>
        </div>
        <ReservationForm />
      </div>

      {/* Staff Banner */}
      <StaffBanner />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} Rotary Sushi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}