// src/components/ReservationForm.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { Clock, Users, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** 
 * Fields for the form input. 
 * If user is logged out, firstName is required, lastName optional.
 * If user is logged in, everything is optional, we fallback to user’s data if blank.
 */
interface ReservationFormData {
  date: string;
  time: string;
  partySize: number;

  // For the contact info
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export default function ReservationForm() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ReservationFormData>({
    date: '',
    time: '',
    partySize: 1,
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // On submit, if user is logged in, fallback to user’s stored info for blank fields
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Convert date+time into "start_time"
    const start_time = `${formData.date}T${formData.time}`;

    // Build contact fields, applying fallback if user is logged in
    const contactFirstName = formData.firstName.trim()
      || (user ? user.name?.split(' ')[0] ?? '' : ''); 
      // ^ if your user object has separate firstName/lastName, adjust accordingly.
    const contactLastName = formData.lastName.trim()
      || (user ? user.name?.split(' ')[1] ?? '' : ''); 
    const contactPhone = formData.phone.trim()
      || (user?.phone ? user.phone : '');
    const contactEmail = formData.email.trim()
      || (user?.email ? user.email : '');

    // If user is not logged in, require first name (and optionally phone/email).
    // Adjust these checks as your restaurant’s policy dictates:
    if (!user) {
      if (!contactFirstName) {
        setError('First name is required if not signed in.');
        return;
      }
      if (!contactEmail) {
        setError('Email is required if not signed in.');
        return;
      }
      // etc.
    }

    try {
      // POST to your Rails reservations endpoint
      const resp = await axios.post('http://localhost:3000/reservations', {
        start_time,
        party_size: formData.partySize,
        // We store first/last name in contact_name or 
        //   in separate fields contact_first_name/contact_last_name if your Rails model has them.
        contact_name: [contactFirstName, contactLastName].filter(Boolean).join(' '),
        contact_phone: contactPhone,
        contact_email: contactEmail,

        // In a multi-restaurant setup, you’d pass the restaurant_id dynamically 
        // or let the server deduce from user’s restaurant. 
        restaurant_id: 1,  
        // status: 'booked', etc., as needed
      });

      setSuccess('Reservation created successfully!');
      console.log('Reservation created:', resp.data);

      // Optionally reset the form
      setFormData({
        date: '',
        time: '',
        partySize: 1,
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
      });
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation. Please try again.');
    }
  };

  const isLoggedIn = !!user;

  return (
    <form 
      onSubmit={handleSubmit} 
      className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6"
    >
      {/* Error / Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date */}
        <div className="space-y-2">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 
                       rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          />
        </div>

        {/* Time */}
        <div className="space-y-2">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="time"
              id="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        {/* Party Size */}
        <div className="space-y-2">
          <label htmlFor="partySize" className="block text-sm font-medium text-gray-700">
            Party Size
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="number"
              id="partySize"
              min="1"
              max="20"
              value={formData.partySize}
              onChange={(e) =>
                setFormData({ ...formData, partySize: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        {/* For a GUEST (not logged in), firstName is required, lastName optional */}
        {/* For a LOGGED IN user, both are optional (fallback to user’s name if blank). */}

        {/* First Name */}
        <div className="space-y-2">
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            {isLoggedIn ? 'First Name (Optional)' : 'First Name (Required)'}
          </label>
          <input
            type="text"
            id="firstName"
            placeholder={isLoggedIn ? user?.name?.split(' ')[0] || '' : 'Enter your first name'}
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 
                       rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            {isLoggedIn ? 'Last Name (Optional)' : 'Last Name (Optional)'}
          </label>
          <input
            type="text"
            id="lastName"
            placeholder={isLoggedIn ? user?.name?.split(' ')[1] || '' : 'Last name (optional)'}
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 
                       rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone {isLoggedIn ? '(Optional)' : '(Required)'}
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              id="phone"
              placeholder={isLoggedIn ? user?.phone ?? '' : 'Enter your phone number'}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email {isLoggedIn ? '(Optional)' : '(Required)'}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="email"
              placeholder={isLoggedIn ? user?.email ?? '' : 'Enter your email'}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-3 px-6 rounded-md 
                     hover:bg-orange-700 transition-colors duration-200 font-semibold"
        >
          Reserve Now
        </button>
      </div>
    </form>
  );
}
