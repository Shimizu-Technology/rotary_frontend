import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Utensils, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      // If there's a "from" param, go there, else go home
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from);
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Subtle background pattern if desired */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        {/* ... wave or subtle pattern ... */}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center shadow-lg transform hover:rotate-180 transition-transform duration-500">
            <Utensils className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage reservations and seating
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 relative overflow-hidden">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 
                             rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 
                             rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Submit button */}
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 rounded-md 
                           shadow-sm text-sm font-medium text-white bg-orange-600 
                           hover:bg-orange-700 focus:outline-none"
              >
                <span className="absolute right-3 inset-y-0 flex items-center">
                  <ChevronRight className="h-5 w-5 text-orange-300 group-hover:text-orange-200 transition-colors" />
                </span>
                Sign in
              </button>
            </div>
          </form>

          {/* "Don't have an account?" link to signup */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-orange-600 hover:text-orange-700 font-medium">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
