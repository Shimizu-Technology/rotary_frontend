// src/components/StaffDashboard.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { Reservation, WaitlistEntry } from '../types';
import SeatLayoutEditor from './SeatLayoutEditor';
import { Clock, Users, Phone, Mail, Search, Filter } from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'layout' | 'reservations' | 'waitlist'>('layout');

  // Reservation + Waitlist states
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  // Default to today's date for filtering
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // If user is not logged in or role check needed, you can do that here
    // But we'll assume the user is logged in due to the ProtectedRoute
    fetchReservations();
    fetchWaitlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReservations = async () => {
    try {
      const resp = await axios.get('http://localhost:3000/reservations');
      // The API likely returns an array of reservation objects
      // We’ll assume it matches your Reservation interface
      setReservations(resp.data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  };

  const fetchWaitlist = async () => {
    try {
      const resp = await axios.get('http://localhost:3000/waitlist_entries');
      // The API likely returns an array of waitlist objects
      setWaitlist(resp.data);
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    }
  };

  // Filter reservations
  const filteredReservations = reservations.filter((reservation) => {
    // If your API returns date/time in separate fields or a single field, adapt accordingly.
    const matchesSearch =
      reservation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.phone?.includes(searchTerm);

    // If your API returns a string date like 2025-01-14, match it to `dateFilter`
    const reservationDate = reservation.date || reservation.start_time?.substring(0, 10);
    const matchesDate = reservationDate === dateFilter;

    return matchesSearch && matchesDate;
  });

  // Filter waitlist
  const filteredWaitlist = waitlist.filter((entry) =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.phone.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('layout')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'layout'
                    ? 'border-orange-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Seating Layout
              </button>
              <button
                onClick={() => setActiveTab('reservations')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'reservations'
                    ? 'border-orange-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reservations
              </button>
              <button
                onClick={() => setActiveTab('waitlist')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  activeTab === 'waitlist'
                    ? 'border-orange-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Waitlist
              </button>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name || user?.email}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Layout Editor */}
        {activeTab === 'layout' && <SeatLayoutEditor />}

        {/* Reservations View */}
        {activeTab === 'reservations' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search reservations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div className="sm:w-48 relative">
                  <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((res) => {
                    // Example: if the Rails API returns "start_time" as e.g. "2025-01-14T18:00:00Z"
                    // you might parse it accordingly:
                    let dateTimeDisplay = res.date
                      ? `${res.date} ${res.time}`
                      : res.start_time
                      ? new Date(res.start_time).toLocaleString()
                      : 'N/A';

                    return (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {dateTimeDisplay}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {res.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            {res.partySize}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col space-y-1">
                            {res.phone && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                {res.phone}
                              </div>
                            )}
                            {res.email && (
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                {res.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {res.status || 'booked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-orange-600 hover:text-orange-900 mr-3">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Waitlist View */}
        {activeTab === 'waitlist' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search waitlist..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Party Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWaitlist.map((entry) => {
                    const joinedTime = entry.joinedAt || entry.check_in_time || '';
                    const joinedDisplay = joinedTime
                      ? new Date(joinedTime).toLocaleTimeString()
                      : 'N/A';

                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {joinedDisplay}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            {entry.partySize}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            {entry.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {entry.status || 'waiting'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-orange-600 hover:text-orange-900 mr-3">
                            Seat Now
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
