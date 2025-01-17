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

  // seat detail modal
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);

  // seat wizard
  const [seatWizard, setSeatWizard] = useState<SeatWizardState>({
    occupantType: null,
    occupantId: null,
    occupantName: '',
    occupantPartySize: 1,
    active: false,
    selectedSeatIds: [],
  });

  // occupant pick
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

  // handle seat click
  function handleSeatClick(seat: Seat) {
    if (seatWizard.active) {
      // if occupant selected enough seats => block
      if (
        !seatWizard.selectedSeatIds.includes(seat.id) &&
        seatWizard.selectedSeatIds.length >= seatWizard.occupantPartySize
      ) {
        alert(
          `This occupant requires exactly ${seatWizard.occupantPartySize} seat(s). Unselect one if you want a different seat.`
        );
        return;
      }

      // if seat is not free, block
      if (seat.status !== 'free' && !seatWizard.selectedSeatIds.includes(seat.id)) {
        alert(`Seat #${seat.label || seat.id} is not free.`);
        return;
      }

      toggleSelectedSeat(seat.id);
    } else {
      setSelectedSeat(seat);
      setShowSeatDialog(true);
    }
  }

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

  // occupant picking => show modal
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
      const found = waitlist.find((w) => w.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantNameFull  = found.contact_name ?? 'Unknown';
      }
    }

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

  // occupant => "seated"
  async function handleSeatNow() {
    if (!seatWizard.active || !seatWizard.occupantId) return;
    // enforce exact seat count
    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      alert(
        `Please select exactly ${seatWizard.occupantPartySize} seat(s). Currently selected: ${seatWizard.selectedSeatIds.length}.`
      );
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
      await axios.post('http://localhost:3000/seat_allocations/multi_create', payload);
      handleCancelWizard();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to seat occupant:', err);
      alert('Seat occupant error. Check console.');
    }
  }

  // occupant => "reserved"
  async function handleReserveSeats() {
    if (!seatWizard.active || !seatWizard.occupantId) return;
    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      alert(
        `Please select exactly ${seatWizard.occupantPartySize} seat(s) to reserve. Currently selected: ${seatWizard.selectedSeatIds.length}.`
      );
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
      await axios.post('http://localhost:3000/seat_allocations/reserve', payload);
      handleCancelWizard();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to reserve occupant seats:', err);
      alert('Reserve occupant error. Check console.');
    }
  }

  // occupant => "finished"/"removed" => seat => "free"
  // (But we also have no_show or cancel or finish)
  // In this sample, we do occupant => "no_show" for the delete action
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

  // occupant => "no_show"
  async function handleNoShow(occupantType: string, occupantId: number) {
    try {
      await axios.post('http://localhost:3000/seat_allocations/no_show', {
        occupant_type: occupantType,
        occupant_id: occupantId,
      });
      handleCloseSeatDialog();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to mark occupant as no_show:', err);
      alert('No-show occupant error. Check console.');
    }
  }

  // occupant => "canceled"
  async function handleCancelOccupant(occupantType: string, occupantId: number) {
    try {
      await axios.post('http://localhost:3000/seat_allocations/cancel', {
        occupant_type: occupantType,
        occupant_id: occupantId,
      });
      handleCloseSeatDialog();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to cancel occupant:', err);
      alert('Cancel occupant error. Check console.');
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

  // occupant pick: only show occupant if status in [ "booked", "reserved", "waiting" ]
  const seatableReservations = reservations.filter((r) =>
    ["booked", "reserved"].includes(r.status || "")
  );
  const seatableWaitlist = waitlist.filter((w) =>
    ["waiting", "reserved"].includes(w.status || "")
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>

      {/* Wizard top bar */}
      {!seatWizard.active ? (
        <button
          onClick={handlePickOccupantOpen}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Seat/Reserve a Party
        </button>
      ) : (
        <div className="flex items-center space-x-2">
          <span>
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
        className="border border-gray-200 mt-4 rounded-lg overflow-auto"
        style={{ width: '100%', height: 600 }}
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

                // color logic
                let seatColor = 'bg-green-500'; // free
                if (seat.status === 'occupied') seatColor = 'bg-red-500';
                if (seat.status === 'reserved') seatColor = 'bg-yellow-400';

                // highlight selected seats in wizard
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
              const firstName = res.contact_name?.split(' ')[0] || 'Guest';

              return (
                <li key={res.id} className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm">
                  <div className="font-semibold">{firstName}</div>
                  <div className="text-xs text-gray-600">
                    Party: {res.party_size}, {res.contact_phone}
                  </div>
                  {t && <div className="text-xs text-blue-500">Time: {t}</div>}
                  <div className="text-xs text-gray-500">Status: {res.status}</div>
                </li>
              );
            })}
          </ul>
        </div>

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
              const firstName = w.contact_name?.split(' ')[0] || 'Guest';

              return (
                <li key={w.id} className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm">
                  <div className="font-semibold">{firstName}</div>
                  <div className="text-xs text-gray-600">
                    Party: {w.party_size}, {w.contact_phone}
                  </div>
                  {t && <div className="text-xs text-blue-500">Checked in: {t}</div>}
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
                  <div className="flex flex-col space-y-2">
                    {/* example: occupant "finished" => seat => free */}
                    <button
                      onClick={() => handleFreeSeat(selectedSeat.allocationId!)}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Mark Finished (Free Seat)
                    </button>
                  </div>
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
                    {/* occupant => arrive => "seated" */}
                    <button
                      onClick={() =>
                        handleArriveOccupant(
                          selectedSeat.occupant_type || 'reservation',
                          selectedSeat.occupant_id!
                        )
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Seat This Party
                    </button>

                    {/* occupant => "no_show" */}
                    <button
                      onClick={() =>
                        handleNoShow(
                          selectedSeat.occupant_type || 'reservation',
                          selectedSeat.occupant_id!
                        )
                      }
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      No-Show
                    </button>

                    {/* occupant => "canceled" */}
                    <button
                      onClick={() =>
                        handleCancelOccupant(
                          selectedSeat.occupant_type || 'reservation',
                          selectedSeat.occupant_id!
                        )
                      }
                      className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      Cancel Reservation
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

            <select
              className="border border-gray-300 rounded w-full p-2"
              value={pickOccupantValue}
              onChange={(e) => setPickOccupantValue(e.target.value)}
            >
              <option value="">-- Choose occupant --</option>

              <optgroup label="Reservations (booked/reserved)">
                {seatableReservations.map((res) => (
                  <option key={`res-${res.id}`} value={`reservation-${res.id}`}>
                    {res.contact_name?.split(' ')[0] || 'Guest'} (Party of {res.party_size})
                  </option>
                ))}
              </optgroup>

              <optgroup label="Waitlist (waiting/reserved)">
                {seatableWaitlist.map((wl) => (
                  <option key={`wl-${wl.id}`} value={`waitlist-${wl.id}`}>
                    {wl.contact_name?.split(' ')[0] || 'Guest'} (Party of {wl.party_size})
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
                className="px-4 py-2 bg-blue-600 text-white rounded"
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
