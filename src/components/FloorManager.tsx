// src/components/FloorManager.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { Reservation } from '../types';
import { Edit2, Users, Phone, Mail } from 'lucide-react';

/** 
 * For Waitlist: we’ll store contact_name, contact_phone, etc.
 */
interface WaitlistEntry {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  party_size?: number;
  check_in_time?: string;
  status?: string;
}

/** 
 * LayoutData from /layouts/1
 */
interface LayoutData {
  id: number;
  name: string;
  sections_data: {
    sections: SeatSection[];
  };
}

/**
 * Each seat might now also include occupant info if it’s “occupied.” 
 * Or store seat_allocation details. We'll just do occupantName, occupantParty, occupantType, occupantId, etc.
 */
interface Seat {
  id: number;
  label?: string;
  position_x: number;
  position_y: number;
  status: 'free' | 'occupied';
  capacity?: number;

  // Optionally occupant details if the seat is occupied:
  occupant_type?: 'reservation' | 'waitlist';
  occupant_id?: number;
  occupant_name?: string;    // e.g. "Leon", "Walk-in Joe", etc.
  occupant_party_size?: number;
  allocationId?: number;     // seat_allocations.id
}

interface SeatSection {
  id: string;
  name: string;
  offsetX: number;
  offsetY: number;
  seats: Seat[];
}

interface FloorManagerProps {
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
}

export default function FloorManager({ reservations, waitlist }: FloorManagerProps) {
  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [loading, setLoading] = useState(true);

  // For seat->reservation/waitlist assignment
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  // "Seat is free" modal or "seat is occupied" modal
  // We’ll unify them in a single “Seat Dialog” but check seat.status to see which sub‐UI to show.
  const [showSeatDialog, setShowSeatDialog] = useState(false);

  // The “pick occupant” dropdown selection. We'll store something like "reservation-2" or "waitlist-3".
  const [pickOccupantValue, setPickOccupantValue] = useState('');

  useEffect(() => {
    loadActiveLayout();
  }, []);

  async function loadActiveLayout() {
    try {
      const resp = await axios.get<LayoutData>('http://localhost:3000/layouts/1');
      setLayout(resp.data);
    } catch (err) {
      console.error('Error loading layout:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSeatClick(seat: Seat) {
    setSelectedSeat(seat);
    setShowSeatDialog(true);
  }

  // Called when staff picks occupant from the dropdown and hits "Seat Them"
  async function handleAssignOccupant() {
    if (!selectedSeat || !pickOccupantValue) return;

    // parse occupant type from the pickOccupantValue => "reservation-2" or "waitlist-5"
    const [occupantType, occupantIdStr] = pickOccupantValue.split('-');
    const occupantId = parseInt(occupantIdStr, 10);

    try {
      // Construct the seat_allocation request
      const seatAllocationPayload: any = {
        seat_id: selectedSeat.id,
        allocated_at: new Date().toISOString(),
      };

      if (occupantType === 'reservation') {
        seatAllocationPayload.reservation_id = occupantId;
      } else {
        seatAllocationPayload.waitlist_entry_id = occupantId;
      }

      await axios.post('http://localhost:3000/seat_allocations', {
        seat_allocation: seatAllocationPayload,
      });

      alert(
        `Seated ${occupantType} #${occupantId} at seat #${selectedSeat.id}`
      );
      handleCloseSeatDialog();
      refreshLayout();
    } catch (err) {
      console.error('Error assigning seat:', err);
      alert('Failed to seat occupant—check console.');
    }
  }

  // Called in the "occupied seat" scenario to free it
  async function handleFreeSeat(allocationId: number) {
    try {
      await axios.delete(`http://localhost:3000/seat_allocations/${allocationId}`);
      alert(`Freed seat_allocation #${allocationId}`);
      handleCloseSeatDialog();
      refreshLayout();
    } catch (err) {
      console.error('Error freeing seat:', err);
      alert('Failed to free seat—check console.');
    }
  }

  function handleCloseSeatDialog() {
    setShowSeatDialog(false);
    setSelectedSeat(null);
    setPickOccupantValue('');
  }

  async function refreshLayout() {
    try {
      const resp = await axios.get<LayoutData>('http://localhost:3000/layouts/1');
      setLayout(resp.data);
    } catch (err) {
      console.error('Error refreshing layout:', err);
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold">Floor Manager</h2>
        <p>Loading layout data...</p>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold">Floor Manager</h2>
        <p>No layout found with ID=1. Check DB or create a layout first.</p>
      </div>
    );
  }

  const seatDiameter = 60;
  const sections = layout.sections_data?.sections || [];

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>
      <p className="text-sm text-gray-600 mb-4">
        Click on a seat to seat a reservation or free it up.
      </p>

      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '600px' }}
      >
        <div
          style={{
            width: 1200,
            height: 800,
            background: '#fff',
            position: 'relative',
          }}
        >
          {sections.map((section) => (
            <div
              key={section.id}
              style={{
                position: 'absolute',
                left: section.offsetX,
                top: section.offsetY,
              }}
            >
              {/* Section header */}
              <div
                className="mb-1 flex items-center justify-between 
                           bg-white/80 backdrop-blur-sm px-2 py-1 rounded shadow"
                style={{ position: 'relative', zIndex: 2 }}
              >
                <span className="font-medium text-sm text-gray-700">
                  {section.name}
                </span>
                <Edit2 className="w-3 h-3 text-gray-400" />
              </div>

              {section.seats.map((seat) => {
                const seatX = seat.position_x - seatDiameter / 2;
                const seatY = seat.position_y - seatDiameter / 2;

                return (
                  <div
                    key={seat.id}
                    style={{
                      position: 'absolute',
                      left: seatX,
                      top: seatY,
                      width: seatDiameter,
                      height: seatDiameter,
                      zIndex: 1,
                    }}
                    className={`
                      flex items-center justify-center rounded-full cursor-pointer
                      text-sm font-medium leading-tight text-white
                      ${
                        seat.status === 'occupied'
                          ? 'bg-red-500'
                          : 'bg-green-500'
                      }
                    `}
                    onClick={() => handleSeatClick(seat)}
                  >
                    {/* If occupant_name is present, we can show that, otherwise seat.label */}
                    <div className="text-center px-1">
                      {seat.occupant_name
                        ? seat.occupant_name
                        : seat.label || `Seat ${seat.id}`}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Reservations & Waitlist side-by-side */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Reservations */}
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
                  {res.party_size ?? 1} &nbsp; &middot; &nbsp;
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
                {/* Optionally show if res.status === 'seated' here */}
              </li>
            ))}
          </ul>
        </div>

        {/* Waitlist */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Waitlist</h3>
          <ul className="space-y-2">
            {waitlist.map((w) => (
              <li
                key={w.id}
                className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
              >
                <div className="font-semibold">{w.contact_name}</div>
                <div className="flex items-center text-gray-600 text-xs mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  {w.party_size ?? 1}
                  {w.contact_phone && (
                    <>
                      &nbsp; &middot; &nbsp;
                      <Phone className="w-3 h-3 mx-1" />
                      {w.contact_phone}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* DIALOG: shows either seat is free => occupant select, or seat is occupied => occupant details */}
      {showSeatDialog && selectedSeat && (
        <div className="fixed inset-0 flex items-center justify-center 
                        bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow w-96 relative">
            <button
              onClick={handleCloseSeatDialog}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            {/* If seat is occupied => occupant modal */}
            {selectedSeat.status === 'occupied' ? (
              <div>
                <h3 className="font-bold text-lg mb-2">
                  Seat Occupied
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Currently occupied by{' '}
                  <strong>
                    {selectedSeat.occupant_name
                      ? `${selectedSeat.occupant_name} (Party of ${selectedSeat.occupant_party_size ?? 1})`
                      : 'someone'}
                  </strong>.
                </p>
                {/* Freed by seat_allocation ID */}
                {selectedSeat.allocationId && (
                  <button
                    onClick={() =>
                      handleFreeSeat(selectedSeat.allocationId!)
                    }
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Free This Seat
                  </button>
                )}
              </div>
            ) : (
              // else if seat is free => occupant selection
              <div>
                <h3 className="font-bold text-lg mb-2">
                  Assign Occupant to Seat
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Which reservation or waitlist entry would you like to seat here?
                </p>

                <select
                  className="border border-gray-300 rounded w-full p-2"
                  value={pickOccupantValue}
                  onChange={(e) => setPickOccupantValue(e.target.value)}
                >
                  <option value="">Select occupant...</option>

                  {/* Reservations */}
                  <optgroup label="Reservations">
                    {reservations.map((res) => (
                      <option
                        key={`reservation-${res.id}`}
                        value={`reservation-${res.id}`}
                      >
                        {res.contact_name} (Party of {res.party_size})
                      </option>
                    ))}
                  </optgroup>

                  {/* Waitlist */}
                  <optgroup label="Waitlist">
                    {waitlist.map((w) => (
                      <option
                        key={`waitlist-${w.id}`}
                        value={`waitlist-${w.id}`}
                      >
                        {w.contact_name} (Party of {w.party_size})
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={handleCloseSeatDialog}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignOccupant}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Seat Them
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
