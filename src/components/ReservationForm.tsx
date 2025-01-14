// src/components/ReservationForm.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { Clock, Users, User, Phone, Mail } from 'lucide-react';

// If you have a type definition:
export interface ReservationFormData {
  date: string;
  time: string;
  partySize: number;
  name: string;
  phone: string;
  email: string;
}

export default function ReservationForm() {
  const [formData, setFormData] = useState<ReservationFormData>({
    date: '',
    time: '',
    partySize: 1,
    name: '',
    phone: '',
    email: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Convert date+time into a single field if your Rails API uses "start_time"
    // or supply them separately if your backend expects `date` and `time`.
    const start_time = `${formData.date}T${formData.time}`;

    try {
      const resp = await axios.post('http://localhost:3000/reservations', {
        // The Rails API’s ReservationsController expects, for example:
        //   start_time, party_size, contact_name, contact_phone, contact_email, status, etc.
        start_time,
        party_size: formData.partySize,
        contact_name: formData.name,
        contact_phone: formData.phone,
        contact_email: formData.email,
        // any other fields you might want, e.g. status: "booked"
      });
      setSuccess('Reservation created successfully!');
      console.log('Reservation created:', resp.data);

      // Optionally reset the form
      setFormData({
        date: '',
        time: '',
        partySize: 1,
        name: '',
        phone: '',
        email: '',
      });
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-4">{success}</div>}

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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
              max="8"
              value={formData.partySize}
              onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-3 px-6 rounded-md hover:bg-orange-700 transition-colors duration-200 font-semibold"
        >
          Reserve Now
        </button>
      </div>
    </form>
  );
}
