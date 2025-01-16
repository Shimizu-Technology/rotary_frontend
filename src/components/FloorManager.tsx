// src/components/FloorManager.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit2 } from 'lucide-react';

interface Reservation {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  party_size?: number;
  status?: string; // e.g. "booked", "seated", "finished", "canceled"
}

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  contact_phone?: string;
  party_size?: number;
  status?: string; // e.g. "waiting", "seated", "removed"
}

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

interface FloorManagerProps {
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  onRefreshData: () => void;  // callback to re-fetch occupant statuses, etc.
}

// For wizard state
interface SeatWizardState {
  occupantType: 'reservation' | 'waitlist' | null;
  occupantId: number | null;
  occupantName: string;
  occupantPartySize: number;
  active: boolean;
  selectedSeatIds: number[];
}

export default function FloorManager({
  reservations,
  waitlist,
  onRefreshData,
}: FloorManagerProps) {
  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [loading, setLoading] = useState(true);

  // If user clicks a seat in normal (non-wizard) mode
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);

  // Wizard state
  const [seatWizard, setSeatWizard] = useState<SeatWizardState>({
    occupantType: null,
    occupantId: null,
    occupantName: '',
    occupantPartySize: 1,
    active: false,
    selectedSeatIds: [],
  });

  // For occupant picking
  const [showPickOccupantModal, setShowPickOccupantModal] = useState(false);
  const [pickOccupantValue, setPickOccupantValue] = useState('');

  useEffect(() => {
    loadActiveLayout();
  }, []);

  async function loadActiveLayout() {
    console.log('[FloorManager] loadActiveLayout => /layouts/1');
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

  // Refresh seat layout after occupant assignment or freeing seats
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

  // ------------------------------------------------------------
  // handleSeatClick
  // If wizard is active, toggle seat selection
  // If wizard is not active, open seat info modal (for freeing seat)
  // ------------------------------------------------------------
  function handleSeatClick(seat: Seat) {
    console.log('[FloorManager] handleSeatClick => seat:', seat);

    if (seatWizard.active) {
      toggleSelectedSeat(seat.id);
      return;
    }

    // Otherwise, old approach: show seat detail
    setSelectedSeat(seat);
    setShowSeatDialog(true);
  }

  // Toggle seat ID in seatWizard.selectedSeatIds
  function toggleSelectedSeat(seatId: number) {
    setSeatWizard((prev) => {
      const alreadySelected = prev.selectedSeatIds.includes(seatId);
      const newSelected = alreadySelected
        ? prev.selectedSeatIds.filter((id) => id !== seatId)
        : [...prev.selectedSeatIds, seatId];

      return { ...prev, selectedSeatIds: newSelected };
    });
  }

  function handleCloseSeatDialog() {
    setSelectedSeat(null);
    setShowSeatDialog(false);
  }

  // ------------------------------------------------------------
  // occupant picking => occupant with status "booked" or "waiting" only
  // ------------------------------------------------------------
  function handlePickOccupantOpen() {
    setShowPickOccupantModal(true);
    setPickOccupantValue('');
  }

  function handlePickOccupantClose() {
    setShowPickOccupantModal(false);
    setPickOccupantValue('');
  }

  function handleOccupantSelected() {
    if (!pickOccupantValue) return;

    const [typeStr, idStr] = pickOccupantValue.split('-');
    const occupantId = parseInt(idStr, 10);
    if (!occupantId) return;

    // Find occupant
    let occupantPartySize = 1;
    let occupantName = '';

    if (typeStr === 'reservation') {
      // We skip reservation if status is not 'booked'
      // But let's just find the occupant:
      const found = reservations.find((r) => r.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantName = found.contact_name ?? 'Unknown';
      }
    } else {
      // typeStr === 'waitlist'
      // We skip if status is not 'waiting'
      const found = waitlist.find((w) => w.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantName = found.contact_name ?? 'Unknown';
      }
    }

    setSeatWizard({
      occupantType: typeStr === 'reservation' ? 'reservation' : 'waitlist',
      occupantId,
      occupantName,
      occupantPartySize,
      active: true,
      selectedSeatIds: [],
    });

    handlePickOccupantClose();
  }

  // ------------------------------------------------------------
  // Cancel wizard
  // ------------------------------------------------------------
  function handleCancelWizard() {
    setSeatWizard({
      occupantType: null,
      occupantId: null,
      occupantName: '',
      occupantPartySize: 1,
      active: false,
      selectedSeatIds: [],
    });
  }

  // ------------------------------------------------------------
  // Finalize wizard => seat occupant => POST /seat_allocations/multi_create
  // ------------------------------------------------------------
  async function handleFinalizeWizard() {
    if (!seatWizard.active || !seatWizard.occupantType || !seatWizard.occupantId) {
      console.warn('Wizard is not active or occupant is missing.');
      return;
    }
    if (seatWizard.selectedSeatIds.length === 0) {
      console.warn('No seats selected.');
      return;
    }

    try {
      const payload = {
        seat_allocation: {
          occupant_type: seatWizard.occupantType,
          occupant_id: seatWizard.occupantId,
          seat_ids: seatWizard.selectedSeatIds,
          allocated_at: new Date().toISOString(),
        },
      };
      console.log('[FloorManager] handleFinalizeWizard => POST /seat_allocations/multi_create =>', payload);

      await axios.post('http://localhost:3000/seat_allocations/multi_create', payload);
      console.log('[FloorManager] finalize wizard => success');

      // Reset wizard, refresh data
      handleCancelWizard();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('[FloorManager] finalize wizard => error =>', err);
      alert('Failed to seat occupant. Check console.');
    }
  }

  // ------------------------------------------------------------
  // "Free occupant seats" => DELETE /seat_allocations/:id
  // This frees all seats for that occupant.
  // ------------------------------------------------------------
  async function handleFreeSeat(allocationId: number) {
    console.log('[FloorManager] handleFreeSeat => allocationId:', allocationId);
    try {
      await axios.delete(`http://localhost:3000/seat_allocations/${allocationId}`);
      console.log('[FloorManager] handleFreeSeat => success');
      handleCloseSeatDialog();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('[FloorManager] handleFreeSeat => error =>', err);
      alert('Failed to free seat(s)—check console.');
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
        <p>No layout found with ID=1. Check the DB or create a layout first.</p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Filter occupant pick options:
  // - Reservations => only those with "booked"
  // - Waitlist => only those with "waiting"
  // Skip occupant if status is "seated", "finished", or "removed"
  // ( i.e. no need to seat them again)
  // ------------------------------------------------------------
  const seatableReservations = reservations.filter(
    (r) => r.status === 'booked',
  );
  const seatableWaitlist = waitlist.filter(
    (w) => w.status === 'waiting',
  );

  // We'll reuse these for occupant pick <select>
  const seatDiameter = 60;
  const canvasWidth = 1200;
  const canvasHeight = 800;
  const sections = layout.sections_data?.sections || [];

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>

      {/* Wizard top bar */}
      <div className="flex items-center space-x-4 mb-4">
        {!seatWizard.active ? (
          <button
            onClick={handlePickOccupantOpen}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Seat a New Party
          </button>
        ) : (
          <>
            <div className="text-sm text-gray-700">
              Seating for {seatWizard.occupantName} (Party of {seatWizard.occupantPartySize})
              — selected {seatWizard.selectedSeatIds.length} seats
            </div>
            <button
              onClick={handleFinalizeWizard}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Finalize Seating
            </button>
            <button
              onClick={handleCancelWizard}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Click on a seat to {seatWizard.active ? 'toggle selection' : 'seat someone or free it'}.
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
                <span className="font-medium text-sm text-gray-700">{section.name}</span>
                <Edit2 className="w-3 h-3 text-gray-400" />
              </div>

              {/* Seats */}
              {section.seats.map((seat) => {
                const seatX = seat.position_x - seatDiameter / 2;
                const seatY = seat.position_y - seatDiameter / 2;

                let seatColor = seat.status === 'occupied' ? 'bg-red-500' : 'bg-green-500';
                // If wizard is active, highlight selected seats in blue if free
                if (seatWizard.active && seat.status === 'free') {
                  const isSelected = seatWizard.selectedSeatIds.includes(seat.id);
                  if (isSelected) {
                    seatColor = 'bg-blue-500';
                  }
                }

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

      {/* Bottom: Display reservations & waitlist lists (for reference) */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Reservations</h3>
          <ul className="space-y-2">
            {reservations.map((res) => (
              <li key={res.id} className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm">
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

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Waitlist</h3>
          <ul className="space-y-2">
            {waitlist.map((w) => (
              <li key={w.id} className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm">
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

      {/* Seat dialog: Freed seat or occupant info */}
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
                  </strong>.
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
                <h3 className="font-bold text-lg mb-2">Seat Is Free</h3>
                <p className="text-sm text-gray-600">
                  This seat is currently free.
                  {seatWizard.active
                    ? ' You can toggle it in the wizard.'
                    : ' Start the wizard to seat someone here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pick Occupant Modal */}
      {showPickOccupantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow w-96 relative">
            <button
              onClick={handlePickOccupantClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            <h3 className="font-bold text-lg mb-2">Select Occupant</h3>
            <select
              className="border border-gray-300 rounded w-full p-2"
              value={pickOccupantValue}
              onChange={(e) => setPickOccupantValue(e.target.value)}
            >
              <option value="">-- Choose occupant --</option>

              <optgroup label="Reservations (booked)">
                {seatableReservations.map((res) => (
                  <option key={`res-${res.id}`} value={`reservation-${res.id}`}>
                    {res.contact_name} (Party of {res.party_size})
                  </option>
                ))}
              </optgroup>

              <optgroup label="Waitlist (waiting)">
                {seatableWaitlist.map((wl) => (
                  <option key={`wl-${wl.id}`} value={`waitlist-${wl.id}`}>
                    {wl.contact_name} (Party of {wl.party_size})
                  </option>
                ))}
              </optgroup>
            </select>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={handlePickOccupantClose}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleOccupantSelected}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Start Seating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
