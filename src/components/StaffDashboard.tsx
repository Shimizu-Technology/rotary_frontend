// src/components/StaffDashboard.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { Reservation } from '../types';

import SeatLayoutEditor from './SeatLayoutEditor';
import ReservationModal from './ReservationModal';
import ReservationFormModal from './ReservationFormModal';
import FloorManager from './FloorManager';

import {
  Clock,
  Users,
  Phone,
  Mail,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  party_size?: number;
  check_in_time?: string;
  status?: string;
}

export default function StaffDashboard() {
  const { user } = useAuth();

  // Tabs: "reservations", "waitlist", "seating", "layout"
  const [activeTab, setActiveTab] = useState<'reservations' | 'waitlist' | 'seating' | 'layout'>('reservations');

  // Data
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // Search + date filter
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Selected reservation + creation modal
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ------------------------
  // On mount, fetch data
  // ------------------------
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // fetch both reservations + waitlist
    await fetchReservations();
    await fetchWaitlist();
  }

  async function fetchReservations() {
    try {
      const resp = await axios.get<Reservation[]>('http://localhost:3000/reservations');
      // Sort earliest -> latest
      const sorted = resp.data.slice().sort((a, b) => {
        const dateA = new Date(a.start_time || '').getTime();
        const dateB = new Date(b.start_time || '').getTime();
        return dateA - dateB;
      });
      setReservations(sorted);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  }

  async function fetchWaitlist() {
    try {
      const resp = await axios.get<WaitlistEntry[]>('http://localhost:3000/waitlist_entries');
      setWaitlist(resp.data);
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    }
  }

  // ------------------------
  // Filtered results
  // ------------------------
  const filteredReservations = reservations.filter((r) => {
    const name = r.contact_name?.toLowerCase() ?? '';
    const phone = r.contact_phone ?? '';
    const email = r.contact_email?.toLowerCase() ?? '';
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      email.includes(searchTerm);

    const dtStr = (r.start_time || '').substring(0, 10);
    const matchesDate = dtStr === dateFilter;

    return matchesSearch && matchesDate;
  });

  const filteredWaitlist = waitlist.filter((w) => {
    const wName = w.contact_name?.toLowerCase() ?? '';
    const wPhone = w.contact_phone ?? '';
    return wName.includes(searchTerm.toLowerCase()) || wPhone.includes(searchTerm);
  });

  // ------------------------
  // Reservation row click => open modal
  // ------------------------
  function handleRowClick(res: Reservation) {
    setSelectedReservation(res);
  }

  async function handleDeleteReservation(id: number) {
    try {
      await axios.delete(`http://localhost:3000/reservations/${id}`);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setSelectedReservation(null);
    } catch (err) {
      console.error('Failed to delete reservation:', err);
    }
  }

  async function handleEditReservation(updated: Reservation) {
    try {
      await axios.patch(`http://localhost:3000/reservations/${updated.id}`, {
        party_size: updated.party_size,
        contact_name: updated.contact_name,
        contact_phone: updated.contact_phone,
        contact_email: updated.contact_email,
        status: updated.status,
      });
      await fetchReservations();
      setSelectedReservation(null);
    } catch (err) {
      console.error('Failed to update reservation:', err);
    }
  }

  function handleCloseModal() {
    setSelectedReservation(null);
  }

  // ------------------------
  // Date nav
  // ------------------------
  function handlePrevDay() {
    const current = new Date(dateFilter);
    current.setDate(current.getDate() - 1);
    setDateFilter(current.toISOString().split('T')[0]);
  }

  function handleNextDay() {
    const current = new Date(dateFilter);
    current.setDate(current.getDate() + 1);
    setDateFilter(current.toISOString().split('T')[0]);
  }

  // ------------------------
  // Create new reservation
  // ------------------------
  function handleCreateNewReservation() {
    setShowCreateModal(true);
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false);
  }

  async function handleCreateReservationSuccess() {
    setShowCreateModal(false);
    await fetchReservations();
  }

  // ------------------------
  // Render
  // ------------------------
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Tabs */}
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
            onClick={() => setActiveTab('seating')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'seating'
                ? 'bg-orange-50 text-orange-700 border border-orange-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Seating
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
        {/* ---------- RESERVATIONS TAB ---------- */}
        {activeTab === 'reservations' && (
          <div className="bg-white shadow rounded-md p-4">
            {/* Search & date filter */}
            <div className="border-b border-gray-200 bg-gray-50 rounded-md p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left side: Search + date nav */}
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                  {/* Search */}
                  <div className="relative w-full sm:w-auto flex-1">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search reservations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 
                                 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  {/* Date nav */}
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
                        className="pl-10 pr-4 py-2 w-36 border border-gray-300 
                                   rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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

                {/* Right side: New reservation */}
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

            {/* Reservations table */}
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
                    const dt = new Date(res.start_time || '');
                    const dateString = dt.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                    });
                    const timeString = dt.toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
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
                          {res.status === 'booked' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                              booked
                            </span>
                          )}
                          {res.status === 'canceled' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              canceled
                            </span>
                          )}
                          {res.status === 'seated' && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              seated
                            </span>
                          )}
                          {!['booked', 'canceled', 'seated'].includes(res.status ?? '') && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-800">
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

        {/* ---------- WAITLIST TAB ---------- */}
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
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 
                             rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                  {filteredWaitlist.map((w) => {
                    const joined = new Date(w.check_in_time || '');
                    const joinedDisplay = isNaN(joined.getTime())
                      ? 'N/A'
                      : joined.toLocaleString();

                    return (
                      <tr key={w.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {joinedDisplay}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          {w.contact_name ?? 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            {w.party_size ?? 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {w.contact_phone ? (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-400 mr-1" />
                              {w.contact_phone}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {w.status ?? 'waiting'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredWaitlist.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No waitlist entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------- SEATING TAB ---------- */}
        {activeTab === 'seating' && (
          <div className="bg-white shadow rounded-md p-4 mt-4">
            {/* Pass onRefreshData to FloorManager so it can call fetchData() */}
            <FloorManager
              reservations={reservations}
              waitlist={waitlist}
              onRefreshData={fetchData}
            />
          </div>
        )}

        {/* ---------- LAYOUT TAB ---------- */}
        {activeTab === 'layout' && (
          <div className="bg-white shadow rounded-md p-4">
            <SeatLayoutEditor />
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      {selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onDelete={handleDeleteReservation}
          onEdit={handleEditReservation}
        />
      )}

      {/* New Reservation Modal */}
      {showCreateModal && (
        <ReservationFormModal
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateReservationSuccess}
        />
      )}
    </div>
  );
}
