import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Reservation, WaitlistEntry } from '../types';
import SeatLayoutEditor from './SeatLayoutEditor';
import { Clock, Users, Phone, Mail, Search, Filter } from 'lucide-react';

// Mock data for development
const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: '1',
    date: '2024-01-15',
    time: '18:00',
    partySize: 4,
    name: 'John Smith',
    phone: '555-0123',
    email: 'john@example.com',
    status: 'confirmed'
  },
  {
    id: '2',
    date: '2024-01-15',
    time: '19:00',
    partySize: 2,
    name: 'Jane Doe',
    phone: '555-0124',
    email: 'jane@example.com',
    status: 'seated'
  }
];

const MOCK_WAITLIST: WaitlistEntry[] = [
  {
    id: '1',
    name: 'Mike Johnson',
    partySize: 3,
    phone: '555-0125',
    joinedAt: new Date().toISOString(),
    status: 'waiting'
  },
  {
    id: '2',
    name: 'Sarah Wilson',
    partySize: 2,
    phone: '555-0126',
    joinedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    status: 'waiting'
  }
];

export default function StaffDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'layout' | 'reservations' | 'waitlist'>('layout');
  const [reservations] = useState<Reservation[]>(MOCK_RESERVATIONS);
  const [waitlist] = useState<WaitlistEntry[]>(MOCK_WAITLIST);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = reservation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.phone.includes(searchTerm);
    const matchesDate = reservation.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  const filteredWaitlist = waitlist.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.phone.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
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
        {activeTab === 'layout' && (
          <SeatLayoutEditor />
        )}

        {/* Reservations View */}
        {activeTab === 'reservations' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search reservations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <div className="relative">
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
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(`${reservation.date}T${reservation.time}`).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reservation.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-2" />
                          {reservation.partySize}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            {reservation.phone}
                          </div>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            {reservation.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          reservation.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : reservation.status === 'seated'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {reservation.status}
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
                  ))}
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
                  {filteredWaitlist.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(entry.joinedAt).toLocaleTimeString()}
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
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.status === 'waiting'
                            ? 'bg-yellow-100 text-yellow-800'
                            : entry.status === 'seated'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.status}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}