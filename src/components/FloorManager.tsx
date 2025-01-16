// src/components/FloorManager.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit2 } from 'lucide-react';

/** Basic occupant shapes */
interface Reservation {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size?: number;
  status?: string; // "booked", "seated", etc.
}

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  party_size?: number;
  status?: string; // "waiting", "seated", etc.
}

/** Layout from /layouts/:id => sections[] => seats[] */
interface LayoutData {
  id: number;
  name: string;
  sections_data: {
    sections: SeatSection[];
  };
}

interface Seat {
  id: number;
  label?: string;
  position_x: number;
  position_y: number;
  status: 'free' | 'occupied';
  capacity?: number;

  occupant_type?: 'reservation' | 'waitlist';
  occupant_id?: number;
  occupant_name?: string;
  occupant_party_size?: number;
  allocationId?: number;
}

interface SeatSection {
  id: string;
  name: string;
  offsetX: number;
  offsetY: number;
  seats: Seat[];
}

/** Props from StaffDashboard */
interface FloorManagerProps {
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  onRefreshData: () => void; // callback to fetch updated occupant statuses
}

export default function FloorManager({
  reservations,
  waitlist,
  onRefreshData,
}: FloorManagerProps) {
  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [loading, setLoading] = useState(true);

  // State for seat->occupant modals
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [pickOccupantValue, setPickOccupantValue] = useState('');

  useEffect(() => {
    loadActiveLayout();
  }, []);

  async function loadActiveLayout() {
    console.log('[FloorManager] loadActiveLayout => GET /layouts/1');
    try {
      const resp = await axios.get<LayoutData>('http://localhost:3000/layouts/1');
      console.log('[FloorManager] layout data =>', resp.data);
      setLayout(resp.data);
    } catch (err) {
      console.error('Error loading layout:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSeatClick(seat: Seat) {
    console.log('[FloorManager] handleSeatClick => seat:', seat);
    setSelectedSeat(seat);
    setShowSeatDialog(true);
  }

  function handleCloseSeatDialog() {
    console.log('[FloorManager] handleCloseSeatDialog');
    setSelectedSeat(null);
    setShowSeatDialog(false);
    setPickOccupantValue('');
  }

  /** If seat is free => staff picks occupant => POST seat_allocations. */
  async function handleAssignOccupant() {
    if (!selectedSeat || !pickOccupantValue) {
      console.log('[FloorManager] handleAssignOccupant => missing seat or occupant');
      return;
    }

    const [occupantType, occupantIdStr] = pickOccupantValue.split('-');
    const occupantId = parseInt(occupantIdStr, 10);

    console.log(
      '[FloorManager] handleAssignOccupant => occupantType:',
      occupantType,
      ' occupantId:',
      occupantId
    );

    const payload: any = {
      seat_id: selectedSeat.id,
      allocated_at: new Date().toISOString(),
    };
    if (occupantType === 'reservation') {
      payload.reservation_id = occupantId;
    } else {
      payload.waitlist_entry_id = occupantId;
    }

    try {
      const resp = await axios.post('http://localhost:3000/seat_allocations', {
        seat_allocation: payload,
      });
      console.log('[FloorManager] handleAssignOccupant => success =>', resp.data);

      // success => close dialog, refresh
      handleCloseSeatDialog();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('[FloorManager] handleAssignOccupant => error =>', err);
      alert('Failed to seat occupant. Check console.');
    }
  }

  /** If seat is occupied => staff can free it => DELETE /seat_allocations/:id */
  async function handleFreeSeat(allocationId: number) {
    console.log('[FloorManager] handleFreeSeat => allocationId:', allocationId);
    try {
      const resp = await axios.delete(`http://localhost:3000/seat_allocations/${allocationId}`);
      console.log('[FloorManager] handleFreeSeat => success =>', resp.data);

      // success => close dialog, refresh
      handleCloseSeatDialog();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('[FloorManager] handleFreeSeat => error =>', err);
      alert('Failed to free seat—check console.');
    }
  }

  async function refreshLayout() {
    console.log('[FloorManager] refreshLayout => /layouts/1');
    try {
      const resp = await axios.get<LayoutData>('http://localhost:3000/layouts/1');
      console.log('[FloorManager] refreshLayout => success =>', resp.data);
      setLayout(resp.data);
    } catch (err) {
      console.error('[FloorManager] refreshLayout => error =>', err);
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
        <p>No layout found with ID=1.</p>
      </div>
    );
  }

  const seatDiameter = 60;
  const canvasWidth = 1200;
  const canvasHeight = 800;
  const sections = layout.sections_data?.sections || [];

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>
      <p className="text-sm text-gray-600 mb-4">
        Click on a seat to seat someone (or free it).
      </p>

      {/* Canvas with seats */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '600px' }}
      >
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            position: 'relative',
            background: '#fff',
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
                className="mb-1 flex items-center justify-between bg-white/80 
                           backdrop-blur-sm px-2 py-1 rounded shadow"
                style={{ position: 'relative', zIndex: 2 }}
              >
                <span className="font-medium text-sm text-gray-700">
                  {section.name}
                </span>
                <Edit2 className="w-3 h-3 text-gray-400" />
              </div>

              {/* Seats */}
              {section.seats.map((seat) => {
                const seatX = seat.position_x - seatDiameter / 2;
                const seatY = seat.position_y - seatDiameter / 2;
                const seatColor =
                  seat.status === 'occupied' ? 'bg-red-500' : 'bg-green-500';

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
                    onClick={() => handleSeatClick(seat)}
                    className={`
                      flex items-center justify-center rounded-full cursor-pointer
                      text-xs text-white text-center font-semibold
                      ${seatColor}
                    `}
                  >
                    {seat.occupant_name
                      ? seat.occupant_name
                      : seat.label ?? `Seat ${seat.id}`}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Reservations & Waitlist below */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Reservations */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Reservations</h3>
          <ul className="space-y-2">
            {reservations.map((res) => (
              <li
                key={res.id}
                className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
              >
                <div className="font-semibold">{res.contact_name}</div>
                <div className="text-xs text-gray-600">
                  Party: {res.party_size ?? 1}, {res.contact_phone}
                </div>
                <div className="text-xs text-gray-500">
                  Status: {res.status}
                </div>
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
                <div className="text-xs text-gray-600">
                  Party: {w.party_size ?? 1}, {w.contact_phone}
                </div>
                <div className="text-xs text-gray-500">
                  Status: {w.status}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Seat Dialog */}
      {showSeatDialog && selectedSeat && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-96 relative">
            <button
              onClick={handleCloseSeatDialog}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            {selectedSeat.status === 'occupied' ? (
              <div>
                <h3 className="font-bold text-lg mb-2">Seat Occupied</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Occupied by{' '}
                  <strong>
                    {selectedSeat.occupant_name
                      ? `${selectedSeat.occupant_name} (Party of ${selectedSeat.occupant_party_size})`
                      : 'someone'}
                  </strong>
                  .
                </p>

                {selectedSeat.allocationId && (
                  <button
                    onClick={() => handleFreeSeat(selectedSeat.allocationId!)}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Free This Seat
                  </button>
                )}
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-lg mb-2">
                  Assign Occupant to Seat
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Which reservation or waitlist entry will occupy this seat?
                </p>
                <select
                  className="border border-gray-300 rounded w-full p-2"
                  value={pickOccupantValue}
                  onChange={(e) => setPickOccupantValue(e.target.value)}
                >
                  <option value="">Select occupant…</option>
                  <optgroup label="Reservations">
                    {reservations
                      .filter((r) => r.status !== 'seated')
                      .map((res) => (
                        <option
                          key={`reservation-${res.id}`}
                          value={`reservation-${res.id}`}
                        >
                          {res.contact_name} (Party of {res.party_size})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Waitlist">
                    {waitlist
                      .filter((w) => w.status !== 'seated')
                      .map((wl) => (
                        <option
                          key={`waitlist-${wl.id}`}
                          value={`waitlist-${wl.id}`}
                        >
                          {wl.contact_name} (Party of {wl.party_size})
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
