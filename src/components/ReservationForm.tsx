// src/components/ReservationForm.tsx
import React, { useState, useEffect } from 'react';
import { Clock, Users, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// IMPORT API helpers
import { fetchAvailability, createReservation } from '../services/api';

interface ReservationFormData {
  date: string;       // "YYYY-MM-DD"
  time: string;       // e.g. "17:30"
  partySize: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export default function ReservationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ReservationFormData>({
    date: '',
    time: '',
    partySize: 1,
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  // We'll store the timeslots from /availability here:
  const [timeslots, setTimeslots] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Whenever `date` or `partySize` changes, fetch /availability
   * so we can populate the time dropdown with valid slots.
   */
  useEffect(() => {
    async function getTimeslots() {
      if (!formData.date || !formData.partySize) {
        setTimeslots([]);
        return;
      }
      try {
        // Call our API helper
        const data = await fetchAvailability(formData.date, formData.partySize);
        setTimeslots(data.slots || []);
      } catch (err) {
        console.error('Error fetching availability:', err);
        setTimeslots([]);
      }
    }

    getTimeslots();
  }, [formData.date, formData.partySize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Combine date + chosen time into an ISO string for `start_time`
    if (!formData.date || !formData.time) {
      setError('Please pick a date and time.');
      return;
    }

    // e.g. "2025-01-25T17:30:00"
    // (We do not append +10:00, letting the backend parse as Guam local.)
    const start_time = `${formData.date}T${formData.time}:00`;

    // fallback logic for logged-in user’s data
    const contactFirstName = formData.firstName.trim()
      || (user ? user.name?.split(' ')[0] ?? '' : '');
    const contactLastName  = formData.lastName.trim()
      || (user ? user.name?.split(' ')[1] ?? '' : '');
    const contactPhone     = formData.phone.trim() || user?.phone || '';
    const contactEmail     = formData.email.trim() || user?.email || '';

    if (!contactFirstName) {
      setError('First name is required.');
      return;
    }

    try {
      // Create the reservation via API
      const newRes = await createReservation({
        start_time,
        party_size: formData.partySize,
        contact_name: [contactFirstName, contactLastName].filter(Boolean).join(' '),
        contact_phone: contactPhone,
        contact_email: contactEmail,
        restaurant_id: 1,
      });

      // If success
      setSuccess('Reservation created successfully!');
      console.log('Reservation created:', newRes);

      // navigate to a confirmation page with the new reservation
      navigate('/reservation-confirmation', {
        state: { reservation: newRes },
      });
    } catch (err) {
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

        {/* Time (Dropdown from timeslots) */}
        <div className="space-y-2">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <select
              id="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 
                         rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            >
              <option value="">-- Select a time --</option>
              {timeslots.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
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
            Last Name (Optional)
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
