// src/components/FloorManager.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { Reservation, WaitlistEntry } from '../types';
import { Edit2, Users, Phone, Mail } from 'lucide-react';

interface LayoutData {
  id: number;
  name: string;
  // sections_data can be multiple shapes
  sections_data: any;
}

interface Seat {
  id: string;
  number: number;
  position: { x: number; y: number };
  isOccupied: boolean;
}

interface SeatSection {
  id: string;
  name: string;
  offsetX: number;
  offsetY: number;
  seats: Seat[];
  // plus type, orientation if needed
}

interface FloorManagerProps {
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
}

export default function FloorManager({ reservations, waitlist }: FloorManagerProps) {
  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [pickReservationId, setPickReservationId] = useState<number | null>(null);

  useEffect(() => {
    const loadActiveLayout = async () => {
      try {
        // For demo, we assume "1" is the ID of the active layout
        const resp = await axios.get<LayoutData>('http://localhost:3000/layouts/1');
        console.log('Layout response data:', resp.data); // For debugging
        setLayout(resp.data);
      } catch (err) {
        console.error('Error loading layout:', err);
      } finally {
        setLoading(false);
      }
    };
    loadActiveLayout();
  }, []);

  // 1) On seat click
  const handleSeatClick = (sectionId: string, seatId: string) => {
    setSelectedSeatId(seatId);
    setShowSeatDialog(true);
  };

  // 2) Assign reservation to seat
  const handleAssignReservation = async () => {
    if (!pickReservationId || !selectedSeatId) return;
    try {
      await axios.post('http://localhost:3000/seat_allocations', {
        seat_allocation: {
          seat_id: selectedSeatId,
          reservation_id: pickReservationId,
          allocated_at: new Date().toISOString(),
        },
      });
      alert(`Seated reservation #${pickReservationId} at seat ${selectedSeatId}`);
      setShowSeatDialog(false);
      setPickReservationId(null);
    } catch (err) {
      console.error('Error assigning seat:', err);
      alert('Failed to seat reservation—check console.');
    }
  };

  // 3) Render states
  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Floor Manager</h2>
        <p>Loading layout data...</p>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Floor Manager</h2>
        <p className="text-gray-600">
          No layout found. Make sure a layout with ID=1 exists, or change the code to fetch a different layout ID.
        </p>
      </div>
    );
  }

  // 4) Safely extract sections from layout.sections_data
  //    layout.sections_data might be null, empty, or various shapes.
  console.log('layout.sections_data is:', layout.sections_data);
  let sections: SeatSection[] = [];

  if (Array.isArray(layout.sections_data)) {
    // If it's already an array, assume it's the array of sections
    sections = layout.sections_data as SeatSection[];
  } else if (
    layout.sections_data &&
    Array.isArray(layout.sections_data.sections)
  ) {
    // If there's a .sections key
    sections = layout.sections_data.sections;
  } else {
    // Fallback empty
    sections = [];
  }

  // Canvas sizing
  const canvasWidth = 1200;
  const canvasHeight = 800;
  const seatScale = 1;
  const seatRadius = 24;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>
      <p className="text-sm text-gray-600 mb-4">
        Click on a seat to seat a reservation or toggle occupancy.
      </p>

      {/* Layout canvas */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '600px' }}
      >
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            background: '#fff',
            position: 'relative',
          }}
        >
          {sections.map((section) => {
            return (
              <div
                key={section.id}
                style={{
                  position: 'absolute',
                  left: section.offsetX ?? 0,
                  top: section.offsetY ?? 0,
                }}
              >
                {/* Section header: placed above seats, so it won't hide behind them */}
                <div className="mb-1 flex items-center justify-between bg-white px-2 py-1 rounded shadow">
                  <span className="font-medium text-sm text-gray-700">
                    {section.name}
                  </span>
                  <Edit2 className="w-3 h-3 text-gray-400" />
                </div>

                {/* Seats */}
                {Array.isArray(section.seats) ? (
                  section.seats.map((seat) => {
                    const seatX = (seat.position.x ?? 0) * seatScale;
                    const seatY = (seat.position.y ?? 0) * seatScale;
                    return (
                      <div
                        key={seat.id}
                        onClick={() => handleSeatClick(section.id, seat.id)}
                        style={{
                          position: 'absolute',
                          left: seatX,
                          top: seatY,
                          width: seatRadius * 2,
                          height: seatRadius * 2,
                        }}
                        className={`
                          flex items-center justify-center rounded-full cursor-pointer
                          ${
                            seat.isOccupied
                              ? 'bg-red-500 text-white'
                              : 'bg-green-500 text-white'
                          }
                        `}
                      >
                        {seat.number}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-red-600 mt-2">
                    No seat array found for section &quot;{section.name}&quot;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-side reservations + waitlist */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Upcoming Reservations</h3>
          <ul className="space-y-2">
            {reservations.map((res) => (
              <li
                key={res.id}
                className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
              >
                <div className="font-semibold">{res.contact_name}</div>
                <div className="flex items-center text-gray-600 text-xs mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  {res.party_size} &nbsp; &middot; &nbsp;
                  {res.contact_phone && (
                    <>
                      <Phone className="w-3 h-3 mx-1" />
                      {res.contact_phone}
                    </>
                  )}
                  {res.contact_email && (
                    <>
                      &nbsp; &middot; &nbsp;
                      <Mail className="w-3 h-3 mx-1" />
                      {res.contact_email}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Waitlist</h3>
          <ul className="space-y-2">
            {waitlist.map((w) => (
              <li
                key={w.id}
                className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
              >
                <div className="font-semibold">{w.name}</div>
                <div className="flex items-center text-gray-600 text-xs mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  {w.partySize}
                  {w.phone && (
                    <>
                      &nbsp; &middot; &nbsp;
                      <Phone className="w-3 h-3 mx-1" />
                      {w.phone}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dialog: pick a reservation to seat at the selected seat */}
      {showSeatDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-4 rounded shadow w-96 relative">
            <button
              onClick={() => setShowSeatDialog(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h3 className="font-bold text-lg mb-2">Assign Reservation to Seat</h3>
            <p className="text-sm text-gray-600 mb-4">
              Which reservation would you like to seat here?
            </p>
            <select
              className="border border-gray-300 rounded w-full p-2"
              value={pickReservationId ?? ''}
              onChange={(e) => setPickReservationId(Number(e.target.value))}
            >
              <option value="">Select a reservation</option>
              {reservations.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.contact_name} (Party of {res.party_size})
                </option>
              ))}
            </select>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowSeatDialog(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignReservation}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Seat Them
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
