import React, { useState } from 'react';
import { Users, User, Phone } from 'lucide-react';

interface WaitlistFormData {
  name: string;
  partySize: number;
  phone: string;
}

export default function WaitlistForm() {
  const [formData, setFormData] = useState<WaitlistFormData>({
    name: '',
    partySize: 1,
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle waitlist submission
    console.log('Waitlist form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <div className="relative mt-1">
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

        <div>
          <label htmlFor="partySize" className="block text-sm font-medium text-gray-700">
            Party Size
          </label>
          <div className="relative mt-1">
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

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="relative mt-1">
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
      </div>

      <div className="mt-6">
        <button
          type="submit"
          className="w-full bg-orange-600 text-white py-3 px-6 rounded-md hover:bg-orange-700 transition-colors duration-200 font-semibold"
        >
          Join Waitlist
        </button>
      </div>
    </form>
  );
}