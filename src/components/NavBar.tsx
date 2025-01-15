import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * NavBar:
 * - Brand on the left ("Rotary Sushi")
 * - If user is NOT logged in, show both "Sign In" and "Sign Up" on the right.
 * - If user IS logged in, show phone link + user icon+name dropdown.
 */
export default function NavBar() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Close the dropdown if a user clicks outside it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Helper to display the user's full name if available, else fallback to email
  const displayName = user && user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email;

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Left: Brand */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-orange-600">
                Rotary Sushi
              </span>
            </Link>
          </div>

          {/* Right: phone link + sign in/up or user dropdown */}
          <div className="flex items-center space-x-6">
            {/* Phone Link (always visible) */}
            <a
              href="tel:671-649-7560"
              className="flex items-center text-orange-600 hover:text-orange-700"
            >
              <Phone className="w-5 h-5 mr-1" />
              671-649-7560
            </a>

            {!user ? (
              // If NO user logged in => show Sign In and Sign Up
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              // If user logged in => user dropdown
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 text-gray-800 hover:text-gray-900 focus:outline-none"
                >
                  {/* Use Lucide's <User /> icon */}
                  <User className="w-5 h-5" />
                  <span>{displayName}</span>
                  {/* Minimal caret or arrow */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transform transition-transform duration-200 ${
                      showDropdown ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
                    <ul className="py-1 text-gray-700">
                      <li>
                        <Link
                          to="/profile"
                          className="block px-4 py-2 hover:bg-gray-100"
                          onClick={() => setShowDropdown(false)}
                        >
                          My Profile
                        </Link>
                      </li>
                      {(user.role === 'admin' || user.role === 'staff') && (
                        <li>
                          <Link
                            to="/dashboard"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setShowDropdown(false)}
                          >
                            Admin Dashboard
                          </Link>
                        </li>
                      )}
                      <li>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                        >
                          Sign Out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
