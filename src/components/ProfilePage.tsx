// src/components/ProfilePage.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      {user ? (
        <div className="bg-white shadow rounded p-6 space-y-4">
          <div>
            <strong>Name:</strong> {user.name || '(No name)'}
          </div>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>Role:</strong> {user.role}
          </div>
          {/* Additional fields as needed */}
        </div>
      ) : (
        <p>You are not logged in.</p>
      )}
    </div>
  );
}
