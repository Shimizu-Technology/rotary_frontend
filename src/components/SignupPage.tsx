// src/components/SignupPage.tsx
import React, { useState } from 'react';
import axios from 'axios';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState('');

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
      setSuccess(resp.data.message || 'User created successfully!');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors(['An error occurred.']);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h1 className="text-2xl mb-4">Signup</h1>
      {success && <p className="text-green-600">{success}</p>}
      {errors.map((error, idx) => (
        <p key={idx} className="text-red-600">{error}</p>
      ))}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Name"
          className="w-full p-2 border rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          className="w-full p-2 border rounded"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          required
        />
        <button type="submit" className="bg-orange-600 text-white px-4 py-2 rounded">
          Sign Up
        </button>
      </form>
    </div>
  );
}
