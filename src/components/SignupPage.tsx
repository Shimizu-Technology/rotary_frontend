import React, { useState } from 'react';
import { ChevronRight, Utensils } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess('');

    try {
      const resp = await axios.post('http://localhost:3000/signup', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      // If the API call succeeds:
      setSuccess(resp.data.message || 'User created successfully!');

      // **Auto-redirect** to the login page:
      navigate('/login');

      // If you prefer to auto-login, you'd fetch a token here and store it,
      // but for now let's do a simple redirect to /login.
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors(['An error occurred.']);
      }
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
          <div
            className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center 
                       shadow-lg transform hover:rotate-180 transition-transform duration-500"
          >
            <Utensils className="h-10 w-10 text-white" />
          </div>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create an Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign up to manage reservations and seating
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 relative overflow-hidden">
          {/* Show success or errors */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-4">
              {success}
            </div>
          )}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
              {errors.map((error, i) => (
                <p key={i}>{error}</p>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 
                           rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-300 
                           rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="Password"
                className="w-full px-3 py-2 border border-gray-300 
                           rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full px-3 py-2 border border-gray-300 
                           rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
              />
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 
                           rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 
                           hover:bg-orange-700 focus:outline-none"
              >
                <span className="absolute right-3 inset-y-0 flex items-center">
                  <ChevronRight className="h-5 w-5 text-orange-300 group-hover:text-orange-200 transition-colors" />
                </span>
                Sign Up
              </button>
            </div>
          </form>

          {/* "Already have an account?" link to login */}
          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
