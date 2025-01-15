import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>
        <p>You are not logged in.</p>
      </div>
    );
  }

  // We can display a combined name or show them individually
  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : '(No name)';

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <div className="bg-white shadow rounded p-6 space-y-4">
        <div>
          <strong>Name:</strong> {displayName}
        </div>
        <div>
          <strong>Email:</strong> {user.email}
        </div>
        <div>
          <strong>Role:</strong> {user.role}
        </div>
        {/* If phone is optional, display if present */}
        {user.phone && (
          <div>
            <strong>Phone:</strong> {user.phone}
          </div>
        )}
      </div>
    </div>
  );
}
