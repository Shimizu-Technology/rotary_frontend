// src/components/FloorManager.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Edit2, LayoutDashboard, Minus, Maximize, Plus as LucidePlus, Settings,
} from 'lucide-react';

/** ---------- Data Interfaces ---------- **/

interface Reservation {
  id: number;
  contact_name?: string;
  start_time?: string;
  party_size?: number;
  status?: string;
  contact_phone?: string;
}

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  check_in_time?: string;
  party_size?: number;
  status?: string;
  contact_phone?: string;
}

interface DBSeat {
  id: number;
  label?: string;
  position_x: number;
  position_y: number;
  status: 'free' | 'reserved' | 'occupied';
  capacity?: number;
  occupant_info?: {
    occupant_type?: 'reservation' | 'waitlist';
    occupant_name?: string;
    occupant_party_size?: number;
  };
  // Or occupant_id/allocationId if needed
}

// The seat section as returned from the new "seat_sections" approach
interface DBSeatSection {
  id: number;          // Real DB ID
  name: string;
  offset_x: number;
  offset_y: number;
  orientation?: string;
  seats: DBSeat[];
}

interface LayoutData {
  id: number;
  name: string;
  seat_sections: DBSeatSection[];
  // Keep sections_data if you want, but we won't rely on it for seat rendering
  sections_data?: any;
}

interface FloorManagerProps {
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  onRefreshData: () => void;  // Possibly reload reservations/waitlist in parent
  onTabChange: (tab: string) => void;
}

// For seat wizard
interface SeatWizardState {
  occupantType: 'reservation' | 'waitlist' | null;
  occupantId: number | null;
  occupantName: string;
  occupantPartySize: number;
  active: boolean;           
  selectedSeatIds: number[]; // seat DB IDs
}

/** Predefined layout sizes or "auto" bounding. */
const LAYOUT_PRESETS = {
  auto:    { width: 0,    height: 0,    seatScale: 1.0 },
  small:   { width: 1200, height: 800,  seatScale: 1.0 },
  medium:  { width: 2000, height: 1200, seatScale: 1.0 },
  large:   { width: 3000, height: 1800, seatScale: 1.0 },
};

export default function FloorManager({
  reservations,
  waitlist,
  onRefreshData,
  onTabChange,
}: FloorManagerProps) {

  const [allLayouts, setAllLayouts] = useState<LayoutData[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [loading, setLoading] = useState(true);

  // Seat detail dialog
  const [selectedSeat, setSelectedSeat] = useState<DBSeat | null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);

  // Seat wizard
  const [seatWizard, setSeatWizard] = useState<SeatWizardState>({
    occupantType: null,
    occupantId: null,
    occupantName: '',
    occupantPartySize: 1,
    active: false,
    selectedSeatIds: [],
  });

  // Occupant modal
  const [showPickOccupantModal, setShowPickOccupantModal] = useState(false);
  const [pickOccupantValue, setPickOccupantValue] = useState('');

  // Layout/canvas sizing & zoom
  const [layoutSize, setLayoutSize] = useState<'auto'|'small'|'medium'|'large'>('medium');
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [seatScale, setSeatScale] = useState(1.0);
  const [zoom, setZoom] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);

  // Load all layouts on mount
  useEffect(() => {
    loadAllLayouts();
  }, []);

  async function loadAllLayouts() {
    setLoading(true);
    try {
      // minimal index: /layouts
      const resp = await axios.get<LayoutData[]>('http://localhost:3000/layouts');
      setAllLayouts(resp.data);

      if (resp.data.length === 0) {
        setLayout(null);
        setSelectedLayoutId(null);
      } else {
        // auto-select first
        const first = resp.data[0];
        setSelectedLayoutId(first.id);
        await fetchOneLayout(first.id);
      }
    } catch (err) {
      console.error('Error loading layouts:', err);
      setLayout(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectLayout(id: number) {
    setSelectedLayoutId(id);
    await fetchOneLayout(id);
  }

  // Fetch the expanded layout from /layouts/:id
  async function fetchOneLayout(layoutId: number) {
    setLoading(true);
    try {
      const resp = await axios.get<LayoutData>(`http://localhost:3000/layouts/${layoutId}`);
      setLayout(resp.data);
      console.log('[fetchOneLayout] =>', resp.data);

      // Example log for seat_sections
      resp.data.seat_sections.forEach((sec, secIndex) => {
        console.log(`Section #${secIndex} => ID=${sec.id}, name=${sec.name}`);
        sec.seats.forEach((st, stIndex) => {
          console.log(`  Seat[${stIndex}] => ID=${st.id}, label=${st.label}, status=${st.status}`);
        });
      });
    } catch (err) {
      console.error('Error fetching layout:', err);
      setLayout(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshLayout() {
    if (!selectedLayoutId) return;
    try {
      const resp = await axios.get<LayoutData>(`http://localhost:3000/layouts/${selectedLayoutId}`);
      setLayout(resp.data);
    } catch (err) {
      console.error('Error refreshing layout:', err);
    }
  }

  // Auto bounds
  useEffect(() => {
    if (!layout) return;
    if (layoutSize === 'auto') {
      computeAutoBounds();
    } else {
      const preset = LAYOUT_PRESETS[layoutSize];
      setCanvasWidth(preset.width);
      setCanvasHeight(preset.height);
      setSeatScale(preset.seatScale);
    }
  }, [layout, layoutSize]);

  function computeAutoBounds() {
    if (!layout) return;
    const seatSections = layout.seat_sections || [];
    if (seatSections.length === 0) {
      setCanvasWidth(1200);
      setCanvasHeight(800);
      setSeatScale(1.0);
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    seatSections.forEach((sec) => {
      sec.seats.forEach((seat) => {
        const globalX = sec.offset_x + seat.position_x;
        const globalY = sec.offset_y + seat.position_y;
        if (globalX < minX) minX = globalX;
        if (globalX > maxX) maxX = globalX;
        if (globalY < minY) minY = globalY;
        if (globalY > maxY) maxY = globalY;
      });
    });

    const margin = 200;
    const width  = maxX - minX + margin;
    const height = maxY - minY + margin;
    setCanvasWidth(Math.max(width, 800));
    setCanvasHeight(Math.max(height, 600));
    setSeatScale(1.0);
  }

  // Seat click & wizard
  function handleSeatClick(seat: DBSeat) {
    if (seatWizard.active) {
      if (!seatWizard.selectedSeatIds.includes(seat.id) &&
          seatWizard.selectedSeatIds.length >= seatWizard.occupantPartySize) {
        alert(`Need exactly ${seatWizard.occupantPartySize} seat(s).`);
        return;
      }
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
      let newSelected: number[];
      if (alreadySelected) {
        newSelected = prev.selectedSeatIds.filter((id) => id !== seatId);
      } else {
        newSelected = [...prev.selectedSeatIds, seatId];
      }
      return { ...prev, selectedSeatIds: newSelected };
    });
  }

  function handleCloseSeatDialog() {
    setSelectedSeat(null);
    setShowSeatDialog(false);
  }

  // Pick occupant => seat wizard
  function handlePickOccupantOpen() {
    setPickOccupantValue('');
    setShowPickOccupantModal(true);
  }

  function handlePickOccupantClose() {
    setPickOccupantValue('');
    setShowPickOccupantModal(false);
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
        occupantNameFull  = found.contact_name ?? 'Guest';
      }
    } else {
      const found = waitlist.find((w) => w.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantNameFull  = found.contact_name ?? 'Guest';
      }
    }

    const occupantName = occupantNameFull.split(/\s+/)[0]; // first name
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

  // Allocations
  async function handleSeatNow() {
    if (!seatWizard.active || !seatWizard.occupantId) return;
    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      alert(`Need exactly ${seatWizard.occupantPartySize} seat(s).`);
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
      alert('Seat occupant error—check console.');
    }
  }

  async function handleReserveSeats() {
    if (!seatWizard.active || !seatWizard.occupantId) return;
    if (seatWizard.selectedSeatIds.length !== seatWizard.occupantPartySize) {
      alert(`Need exactly ${seatWizard.occupantPartySize} seat(s).`);
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
      alert('Reserve occupant error—check console.');
    }
  }

  async function handleFreeSeat(allocationId: number) {
    try {
      await axios.delete(`http://localhost:3000/seat_allocations/${allocationId}`);
      handleCloseSeatDialog();
      await refreshLayout();
      onRefreshData();
    } catch (err) {
      console.error('Failed to free seat:', err);
      alert('Free seat error—check console.');
    }
  }

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
      console.error('Arrive occupant error:', err);
      alert('Arrive occupant error—check console.');
    }
  }

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
      console.error('No-show occupant error:', err);
      alert('No-show occupant error—check console.');
    }
  }

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
      console.error('Cancel occupant error:', err);
      alert('Cancel occupant error—check console.');
    }
  }

  if (loading) {
    return <div>Loading layout data...</div>;
  }
  if (!layout) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <div className="text-center max-w-md px-4">
          <LayoutDashboard className="mx-auto text-gray-300" size={64} />
          <h2 className="text-xl font-semibold text-gray-800 mt-4">No Layout Found</h2>
          <p className="text-gray-600 mt-2">
            It looks like this restaurant hasn’t set up a layout yet.
            You can create one to manage seating arrangements.
          </p>
          <button
            onClick={() => onTabChange('layout')}
            className="inline-flex items-center px-4 py-2 mt-5 bg-orange-600 text-white rounded shadow hover:bg-orange-700"
          >
            Create a Layout
          </button>
        </div>
      </div>
    );
  }

  // Filter seatable reservations/waitlist
  const seatableReservations = reservations.filter((r) =>
    ['booked', 'reserved'].includes(r.status ?? '')
  );
  const seatableWaitlist = waitlist.filter((w) =>
    ['waiting', 'reserved'].includes(w.status ?? '')
  );

  // We'll read seat_sections from layout
  const sections = layout.seat_sections || [];
  const seatDiameterBase = 60;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>

      <div className="flex items-center space-x-4 mb-4">
        {/* Layout selection */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Layout:</label>
          <select
            value={selectedLayoutId ?? ''}
            onChange={(e) => handleSelectLayout(Number(e.target.value))}
            className="border border-gray-300 rounded p-1"
          >
            <option value="">-- Choose Layout --</option>
            {allLayouts.map((ld) => (
              <option key={ld.id} value={ld.id}>
                {ld.name}
              </option>
            ))}
          </select>
        </div>

        {/* Layout size */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">View Size:</label>
          <select
            value={layoutSize}
            onChange={(e) =>
              setLayoutSize(e.target.value as 'auto'|'small'|'medium'|'large')
            }
            className="px-2 py-1 border border-gray-300 rounded"
          >
            <option value="auto">Auto (by seats)</option>
            <option value="small">Small (1200×800)</option>
            <option value="medium">Medium (2000×1200)</option>
            <option value="large">Large (3000×1800)</option>
          </select>
        </div>

        {/* Grid toggle */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-2 rounded ${
            showGrid ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Settings className="inline w-4 h-4 mr-1" />
          Grid
        </button>

        {/* Zoom controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.2))}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 5.0))}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <LucidePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Reset Zoom"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Seat/Reserve Wizard */}
      {!seatWizard.active ? (
        <button
          onClick={handlePickOccupantOpen}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Seat/Reserve a Party
        </button>
      ) : (
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm text-gray-800">
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

      {/* Canvas area */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: 600 }}
      >
        <div
          style={{
            position: 'relative',
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#fff',
            backgroundImage: showGrid
              ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
              : 'none',
            backgroundSize: '20px 20px',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {sections.map((section, secIndex) => {
            return (
              <div
                key={`section-${section.id}`}
                style={{
                  position: 'absolute',
                  left: section.offset_x,
                  top: section.offset_y,
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

                {section.seats.map((seat, seatIdx) => {
                  const keyVal = seat.id ? `seat-${seat.id}` : `temp-${seatIdx}`;
                  const seatX = seat.position_x - seatDiameterBase / 2;
                  const seatY = seat.position_y - seatDiameterBase / 2;

                  let seatColor = 'bg-green-500';
                  if (seat.status === 'occupied') seatColor = 'bg-red-500';
                  if (seat.status === 'reserved') seatColor = 'bg-yellow-400';

                  const isSelected = seatWizard.selectedSeatIds.includes(seat.id);
                  if (seatWizard.active && seat.status === 'free' && isSelected) {
                    seatColor = 'bg-blue-500';
                  }

                  // occupant_info is optional if you want occupant_name, etc.
                  const occupantName = seat.occupant_info?.occupant_name;
                  const occupantDisplay = occupantName || seat.label || `Seat ${seat.id}`;

                  return (
                    <div
                      key={keyVal}
                      onClick={() => handleSeatClick(seat)}
                      style={{
                        position: 'absolute',
                        left: seatX,
                        top: seatY,
                        width: seatDiameterBase,
                        height: seatDiameterBase,
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
            );
          })}
        </div>
      </div>

      {/* Reservations & Waitlist */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Reservations */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Reservations</h3>
          <ul className="space-y-2">
            {reservations.map((res) => {
              const t = res.start_time
                ? new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const firstName = res.contact_name?.split(' ')[0] || 'Guest';
              return (
                <li
                  key={`reservation-${res.id}`}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
                >
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

        {/* Waitlist */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Waitlist</h3>
          <ul className="space-y-2">
            {waitlist.map((w) => {
              const t = w.check_in_time
                ? new Date(w.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const firstName = w.contact_name?.split(' ')[0] || 'Guest';
              return (
                <li
                  key={`waitlist-${w.id}`}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
                >
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

      {/* Seat Detail Dialog */}
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
                    {selectedSeat.occupant_info?.occupant_name || 'someone'} 
                    (Party of {selectedSeat.occupant_info?.occupant_party_size ?? 1})
                  </strong>
                </p>
                {/* If occupant has an allocationId, you can free it */}
                {selectedSeat.occupant_info && (
                  <button
                    onClick={() => {
                      // call handleFreeSeat(...) if you store occupant seat_allocation ID
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Mark No-Show / Free Seat
                  </button>
                )}
              </div>
            ) : selectedSeat.status === 'reserved' ? (
              <div>
                <h3 className="font-bold text-lg mb-2">Seat Reserved</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Reserved by{' '}
                  <strong>
                    {selectedSeat.occupant_info?.occupant_name || 'someone'} 
                    (Party of {selectedSeat.occupant_info?.occupant_party_size ?? 1})
                  </strong>
                </p>
                {/* ...similar logic for arrival / free seat */}
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
