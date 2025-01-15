// src/components/StaffDashboard.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { Reservation, WaitlistEntry } from '../types';

import SeatLayoutEditor from './SeatLayoutEditor';
import ReservationModal from './ReservationModal';
import ReservationFormModal from './ReservationFormModal';

import { 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  // The tabs are now: "reservations", "waitlist", "layout" in that order
  const [activeTab, setActiveTab] = useState<'reservations' | 'waitlist' | 'layout'>('reservations');

  // Data
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // Search + filter
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // For modals:
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchReservations();
    fetchWaitlist();
  }, []);

  // ----------------------------------
  // Data fetching
  // ----------------------------------
  const fetchReservations = async () => {
    try {
      const resp = await axios.get<Reservation[]>('http://localhost:3000/reservations');
      // Sort earliest → latest by start_time
      const sorted = resp.data.slice().sort((a, b) => {
        const dateA = new Date(a.start_time).getTime();
        const dateB = new Date(b.start_time).getTime();
        return dateA - dateB;
      });
      setReservations(sorted);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  };

  const fetchWaitlist = async () => {
    try {
      const resp = await axios.get<WaitlistEntry[]>('http://localhost:3000/waitlist_entries');
      setWaitlist(resp.data);
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    }
  };

  // ----------------------------------
  // Reservation filters
  // ----------------------------------
  const filteredReservations = reservations.filter((reservation) => {
    const contactName = reservation.contact_name?.toLowerCase() ?? '';
    const phone = reservation.contact_phone ?? '';
    const email = reservation.contact_email?.toLowerCase() ?? '';

    const matchesSearch =
      contactName.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      email.includes(searchTerm);

    // Compare only YYYY-MM-DD
    const dtStr = reservation.start_time.substring(0, 10); 
    const matchesDate = dtStr === dateFilter;

    return matchesSearch && matchesDate;
  });

  // ----------------------------------
  // Waitlist filters
  // ----------------------------------
  const filteredWaitlist = waitlist.filter((entry) => {
    const name = entry.name?.toLowerCase() ?? '';
    const phone = entry.phone ?? '';
    return (
      name.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm)
    );
  });

  // ----------------------------------
  // Row click => open modal
  // ----------------------------------
  const handleRowClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
  };

  // ----------------------------------
  // Reservation modal callbacks
  // ----------------------------------
  const handleCloseModal = () => {
    setSelectedReservation(null);
  };

  const handleDeleteReservation = async (id: number) => {
    try {
      await axios.delete(`http://localhost:3000/reservations/${id}`);
      // Remove from local state or refetch
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setSelectedReservation(null);
    } catch (err) {
      console.error('Failed to delete reservation:', err);
    }
  };

  const handleEditReservation = async (updated: Reservation) => {
    try {
      await axios.patch(`http://localhost:3000/reservations/${updated.id}`, {
        party_size: updated.party_size,
        contact_name: updated.contact_name,
        contact_phone: updated.contact_phone,
        contact_email: updated.contact_email,
        status: updated.status,
      });
      // Re-fetch or locally update
      await fetchReservations();
      setSelectedReservation(null);
    } catch (err) {
      console.error('Failed to update reservation:', err);
    }
  };

  // ----------------------------------
  // Date nav: arrows
  // ----------------------------------
  const handlePrevDay = () => {
    const current = new Date(dateFilter);
    current.setDate(current.getDate() - 1);
    setDateFilter(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = new Date(dateFilter);
    current.setDate(current.getDate() + 1);
    setDateFilter(current.toISOString().split('T')[0]);
  };

  // ----------------------------------
  // Creating new reservation
  // ----------------------------------
  const handleCreateNewReservation = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleCreateReservationSuccess = async () => {
    setShowCreateModal(false);
    await fetchReservations();
  };

  // ----------------------------------
  // Render
  // ----------------------------------
  return (
    <div className="bg-gray-50 min-h-screen">

      {/* Tabs: Reservations / Waitlist / Layout */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-md shadow p-3 flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'reservations'
                ? 'bg-orange-50 text-orange-700 border border-orange-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Reservations
          </button>
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'waitlist'
                ? 'bg-orange-50 text-orange-700 border border-orange-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Waitlist
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'layout'
                ? 'bg-orange-50 text-orange-700 border border-orange-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Layout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* --------------------------------------
             Tab: Reservations
        -------------------------------------- */}
        {activeTab === 'reservations' && (
          <div className="bg-white shadow rounded-md p-4">
            {/* Search + Filter bar */}
            <div className="border-b border-gray-200 bg-gray-50 rounded-md p-4">
              {/* 
                 We'll arrange everything in a row: 
                 search input, arrow buttons + date, then
                 the "New Reservation" button with some margin 
              */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                
                {/* Left section: search + date controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                  {/* Search input */}
                  <div className="relative w-full sm:w-auto flex-1">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search reservations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md 
                                 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  {/* Arrow buttons + date input */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handlePrevDay}
                      className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                      title="Previous day"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="relative">
                      <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-10 pr-4 py-2 w-36 border border-gray-300 rounded-md 
                                   focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <button
                      onClick={handleNextDay}
                      className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                      title="Next day"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Right section: New Reservation button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleCreateNewReservation}
                    className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
                  >
                    + New Reservation
                  </button>
                </div>
              </div>
            </div>

            {/* Reservations Table */}
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Date/Time
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Party Size
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReservations.map((res) => {
                    const dt = new Date(res.start_time);
                    const dateString = dt.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric'
                    });
                    const timeString = dt.toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit'
                    });
                    const dateTimeDisplay = `${dateString}, ${timeString}`;

                    return (
                      <tr
                        key={res.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(res)}
                      >
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          {dateTimeDisplay}
                        </td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          {res.contact_name ?? 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            {res.party_size ?? 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            {res.contact_phone && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 text-gray-400 mr-1" />
                                {res.contact_phone}
                              </div>
                            )}
                            {res.contact_email && (
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 text-gray-400 mr-1" />
                                {res.contact_email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Color-coded status */}
                          {res.status === 'booked' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                             bg-orange-100 text-orange-800">
                              booked
                            </span>
                          )}
                          {res.status === 'canceled' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                             bg-red-100 text-red-800">
                              canceled
                            </span>
                          )}
                          {res.status === 'seated' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                             bg-green-100 text-green-800">
                              seated
                            </span>
                          )}
                          {!['booked','canceled','seated'].includes(res.status ?? '') && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                             bg-gray-200 text-gray-800">
                              {res.status ?? 'N/A'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredReservations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No reservations found for this date or search term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --------------------------------------
             Tab: Waitlist
        -------------------------------------- */}
        {activeTab === 'waitlist' && (
          <div className="bg-white shadow rounded-md overflow-hidden p-4 mt-4">
            <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-md">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search waitlist..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md 
                             focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Time Joined
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Party Size
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWaitlist.map((entry) => {
                    const joined = new Date(entry.check_in_time || '');
                    const joinedDisplay = isNaN(joined.getTime())
                      ? 'N/A'
                      : joined.toLocaleString();

                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {joinedDisplay}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          {entry.name ?? 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            {entry.partySize ?? 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            {entry.phone ?? 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                         bg-yellow-100 text-yellow-800">
                            {entry.status ?? 'waiting'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredWaitlist.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No waitlist entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --------------------------------------
             Tab: Layout
        -------------------------------------- */}
        {activeTab === 'layout' && (
          <div className="bg-white shadow rounded-md p-4">
            <SeatLayoutEditor />
          </div>
        )}
      </div>

      {/* Reservation Details Modal */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onDelete={handleDeleteReservation}
          onEdit={handleEditReservation}
        />
      )}

      {/* "New Reservation" Modal */}
      {showCreateModal && (
        <ReservationFormModal
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateReservationSuccess}
        />
      )}
    </div>
  );
}
