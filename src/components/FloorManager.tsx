// src/components/FloorManager.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit2 } from 'lucide-react';

interface Reservation {
  id: number;
  contact_name?: string;
  start_time?: string;
  party_size?: number;
  status?: string; // "booked", "reserved", "seated", "finished", "canceled", "no_show"
  contact_phone?: string;
}

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  check_in_time?: string;
  party_size?: number;
  status?: string; // "waiting", "reserved", "seated", "removed", "no_show"
  contact_phone?: string;
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
  // "free", "reserved", or "occupied"
  status: 'free' | 'reserved' | 'occupied';
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
  onRefreshData: () => void;
}

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

  // For seat detail dialog
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);

  // Wizard for occupant assignment
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
    loadLayout();
  }, []);

  async function loadLayout() {
    try {
      const resp = await axios.get<LayoutData>('http://localhost:3000/layouts/1');
      setLayout(resp.data);
    } catch (err) {
      console.error('Error loading layout:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshLayout() {
    try {
      const resp = await axios.get<LayoutData>('http://localhost:3000/layouts/1');
      setLayout(resp.data);
    } catch (err) {
      console.error('Error refreshing layout:', err);
    }
  }

  // -----------------------------
  // Handle seat click
  // -----------------------------
  function handleSeatClick(seat: Seat) {
    // If wizard is active, toggle seat selection (with checks)
    if (seatWizard.active) {
      // If occupant has already selected as many seats as their party size, block new seat
      if (
        !seatWizard.selectedSeatIds.includes(seat.id) &&
        seatWizard.selectedSeatIds.length >= seatWizard.occupantPartySize
      ) {
        alert(
          `This occupant needs exactly ${seatWizard.occupantPartySize} seat(s). 
Unselect one first if you want to choose another seat.`
        );
        return;
      }

      // If seat is not free and not already selected, block it
      if (seat.status !== 'free' && !seatWizard.selectedSeatIds.includes(seat.id)) {
        alert(`Seat #${seat.label || seat.id} is not free.`);
        return;
      }

      toggleSelectedSeat(seat.id);
    } else {
      // If wizard is not active, open seat detail modal
      setSelectedSeat(seat);
      setShowSeatDialog(true);
    }
  }

  function toggleSelectedSeat(seatId: number) {
    setSeatWizard((prev) => {
      const isSelected = prev.selectedSeatIds.includes(seatId);
      const newSelected = isSelected
        ? prev.selectedSeatIds.filter((id) => id !== seatId)
        : [...prev.selectedSeatIds, seatId];
      return { ...prev, selectedSeatIds: newSelected };
    });
  }

  function handleCloseSeatDialog() {
    setSelectedSeat(null);
    setShowSeatDialog(false);
  }

  // -----------------------------
  // Occupant picking => show/hide
  // -----------------------------
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

    let occupantPartySize = 1;
    let occupantNameFull = 'Unknown';

    if (typeStr === 'reservation') {
      const found = reservations.find((r) => r.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantNameFull  = found.contact_name ?? 'Unknown';
      }
    } else {
      // waitlist
      const found = waitlist.find((w) => w.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantNameFull  = found.contact_name ?? 'Unknown';
      }
    }

    // Optional: parse first name
    const occupantName = occupantNameFull.split(/\s+/)[0];

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

  // -----------------------------
  // Cancel wizard
  // -----------------------------
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

  // -----------------------------
  // Seat occupant => occupant => "seated"; seats => "occupied"
  // -----------------------------
  async function handleSeatNow() {
    if (!seatWizard.active || !seatWizard.occupantId) return;

    // Must select exactly occupantPartySize seats
    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      alert(
        `Please select exactly ${seatWizard.occupantPartySize} seat(s). 
Currently: ${seatWizard.selectedSeatIds.length}`
      );
      return;
    }

    try {
      await axios.post('http://localhost:3000/seat_allocations/multi_create', {
        seat_allocation: {
          occupant_type: seatWizard.occupantType,
          occupant_id: seatWizard.occupantId,
          seat_ids: seatWizard.selectedSeatIds,
          allocated_at: new Date().toISOString(),
        },
      });
      handleCancelWizard();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to seat occupant:', err);
      alert('Seat occupant error. Check console.');
    }
  }

  // -----------------------------
  // Reserve occupant => occupant => "reserved", seats => "reserved"
  // -----------------------------
  async function handleReserveSeats() {
    if (!seatWizard.active || !seatWizard.occupantId) return;

    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      alert(
        `Please select exactly ${seatWizard.occupantPartySize} seat(s) to reserve. 
Currently: ${seatWizard.selectedSeatIds.length}`
      );
      return;
    }

    try {
      await axios.post('http://localhost:3000/seat_allocations/reserve', {
        seat_allocation: {
          occupant_type: seatWizard.occupantType,
          occupant_id: seatWizard.occupantId,
          seat_ids: seatWizard.selectedSeatIds,
          allocated_at: new Date().toISOString(),
        },
      });
      handleCancelWizard();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to reserve occupant seats:', err);
      alert('Reserve occupant error. Check console.');
    }
  }

  // -----------------------------
  // Free occupant seats => occupant => no_show => seat => "free"
  // -----------------------------
  async function handleFreeSeat(allocationId: number) {
    try {
      await axios.delete(`http://localhost:3000/seat_allocations/${allocationId}`);
      handleCloseSeatDialog();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to free seat(s):', err);
      alert('Free seat error. Check console.');
    }
  }

  // occupant => "seated" from "reserved"
  async function handleArriveOccupant(occupantType: string, occupantId: number) {
    try {
      await axios.post('http://localhost:3000/seat_allocations/arrive', {
        occupant_type: occupantType,
        occupant_id: occupantId,
      });
      handleCloseSeatDialog();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to seat occupant from reserved state:', err);
      alert('Arrive occupant error. Check console.');
    }
  }

  if (loading) {
    return <div>Loading layout data...</div>;
  }
  if (!layout) {
    return <div>No layout found (ID=1). Check the DB or create a layout first.</div>;
  }

  const seatDiameter = 60;
  const sections = layout.sections_data?.sections || [];

  // Only show occupant if status == "booked" (for reservations) or "waiting" (for waitlist).
  // This excludes occupant with status "reserved" from the wizard pick list.
  const seatableReservations = reservations.filter(
    (r) => r.status === 'booked'
  );
  const seatableWaitlist = waitlist.filter(
    (w) => w.status === 'waiting'
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>

      {!seatWizard.active ? (
        <button
          onClick={handlePickOccupantOpen}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Seat/Reserve a Party
        </button>
      ) : (
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-gray-700">
            Seating for {seatWizard.occupantName} (Party of {seatWizard.occupantPartySize}) — 
            selected {seatWizard.selectedSeatIds.length} seat(s)
          </span>
          <button
            onClick={handleSeatNow}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Seat Now
          </button>
          <button
            onClick={handleReserveSeats}
            className="px-4 py-2 bg-orange-600 text-white rounded"
          >
            Reserve Seats
          </button>
          <button
            onClick={handleCancelWizard}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Canvas */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '600px' }}
      >
        <div
          style={{
            position: 'relative',
            width: 1200,
            height: 800,
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
              <div
                className="mb-1 flex items-center justify-between bg-white/80 
                           backdrop-blur-sm px-2 py-1 rounded shadow"
                style={{ position: 'relative', zIndex: 2 }}
              >
                <span className="font-medium text-sm text-gray-700">{section.name}</span>
                <Edit2 className="w-3 h-3 text-gray-400" />
              </div>

              {section.seats.map((seat) => {
                const seatX = seat.position_x - seatDiameter / 2;
                const seatY = seat.position_y - seatDiameter / 2;

                let seatColor = 'bg-green-500'; // free
                if (seat.status === 'occupied') seatColor = 'bg-red-500';
                if (seat.status === 'reserved') seatColor = 'bg-yellow-400';

                // highlight if wizard is active and seat is free+selected
                if (seatWizard.active && seat.status === 'free') {
                  const isSelected = seatWizard.selectedSeatIds.includes(seat.id);
                  if (isSelected) seatColor = 'bg-blue-500';
                }

                const occupantDisplay = seat.occupant_name || seat.label || `Seat ${seat.id}`;

                return (
                  <div
                    key={seat.id}
                    onClick={() => handleSeatClick(seat)}
                    style={{
                      position: 'absolute',
                      left: seatX,
                      top: seatY,
                      width: seatDiameter,
                      height: seatDiameter,
                      zIndex: 1,
                    }}
                    className={`
                      ${seatColor}
                      flex items-center justify-center text-center
                      text-white text-xs font-semibold
                      rounded-full cursor-pointer
                    `}
                  >
                    {occupantDisplay}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Reservations & Waitlist */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Reservations */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Reservations</h3>
          <ul className="space-y-2">
            {reservations.map((res) => {
              const t = res.start_time
                ? new Date(res.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';
              return (
                <li
                  key={res.id}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
                >
                  <div className="font-semibold">{res.contact_name}</div>
                  <div className="text-xs text-gray-600">
                    Party: {res.party_size}, {res.contact_phone}
                  </div>
                  {t && (
                    <div className="text-xs text-blue-500">Time: {t}</div>
                  )}
                  <div className="text-xs text-gray-500">Status: {res.status}</div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Waitlist */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Waitlist</h3>
          <ul className="space-y-2">
            {waitlist.map((w) => {
              const t = w.check_in_time
                ? new Date(w.check_in_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';
              return (
                <li
                  key={w.id}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
                >
                  <div className="font-semibold">{w.contact_name}</div>
                  <div className="text-xs text-gray-600">
                    Party: {w.party_size}, {w.contact_phone}
                  </div>
                  {t && (
                    <div className="text-xs text-blue-500">
                      Checked in: {t}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">Status: {w.status}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Seat dialog */}
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
                    {selectedSeat.occupant_name || 'someone'} (Party of {selectedSeat.occupant_party_size})
                  </strong>
                </p>
                {selectedSeat.allocationId && (
                  <button
                    onClick={() => handleFreeSeat(selectedSeat.allocationId!)}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Free This Seat (No-Show)
                  </button>
                )}
              </div>
            ) : selectedSeat.status === 'reserved' ? (
              <div>
                <h3 className="font-bold text-lg mb-2">Seat Reserved</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Reserved by{' '}
                  <strong>
                    {selectedSeat.occupant_name || 'someone'} (Party of {selectedSeat.occupant_party_size})
                  </strong>
                </p>
                {selectedSeat.allocationId && (
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() =>
                        handleArriveOccupant(
                          selectedSeat.occupant_type || 'reservation',
                          selectedSeat.occupant_id!
                        )
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Seat This Party (Arrive)
                    </button>
                    <button
                      onClick={() => handleFreeSeat(selectedSeat.allocationId!)}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Cancel / No-Show
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-lg mb-2">Seat Is Free</h3>
                <p className="text-sm text-gray-600">
                  This seat is currently free.
                  {seatWizard.active
                    ? ' You can toggle it in the wizard.'
                    : ' Start the wizard to seat or reserve someone here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pick occupant modal */}
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

            {/* 
               We exclude occupant with status === 'reserved'. 
               So only 'booked' (for reservations) or 'waiting' (for waitlist). 
            */}
            <select
              className="border border-gray-300 rounded w-full p-2"
              value={pickOccupantValue}
              onChange={(e) => setPickOccupantValue(e.target.value)}
            >
              <option value="">-- Choose occupant --</option>

              <optgroup label="Reservations (booked)">
                {seatableReservations.map((res) => (
                  <option key={`res-${res.id}`} value={`reservation-${res.id}`}>
                    {res.contact_name?.split(' ')[0] || 'Guest'} (Party of {res.party_size})
                  </option>
                ))}
              </optgroup>

              <optgroup label="Waitlist (waiting)">
                {seatableWaitlist.map((w) => (
                  <option key={`wl-${w.id}`} value={`waitlist-${w.id}`}>
                    {w.contact_name?.split(' ')[0] || 'Guest'} (Party of {w.party_size})
                  </option>
                ))}
              </optgroup>
            </select>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={handlePickOccupantClose}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleOccupantSelected}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Start Wizard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
