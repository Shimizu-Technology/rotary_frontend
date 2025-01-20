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
  start_time?: string;    // e.g. "2025-01-25T19:00:00Z"
  party_size?: number;
  status?: string;        // "booked", "reserved", etc.
  contact_phone?: string;
}

interface WaitlistEntry {
  id: number;
  contact_name?: string;
  check_in_time?: string; // e.g. "2025-01-20T18:30:00Z"
  party_size?: number;
  status?: string;        // "waiting", "seated", etc.
  contact_phone?: string;
}

interface SeatAllocation {
  id: number;
  seat_id: number;
  occupant_type: 'reservation' | 'waitlist' | null;
  occupant_id: number | null;
  occupant_name?: string;
  occupant_party_size?: number;
  occupant_status?: string;  // "reserved", "occupied", etc.
  allocated_at?: string;
  released_at?: string | null;
}

interface SeatOccupantInfo {
  occupant_type?: 'reservation' | 'waitlist';
  occupant_id?: number;
  occupant_name?: string;
  occupant_party_size?: number;
  occupant_status?: string;
}

interface DBSeat {
  id: number;
  label?: string;
  position_x: number;
  position_y: number;
  status: 'free' | 'reserved' | 'occupied'; // from DB, but we’ll override per-day
  capacity?: number;
  // occupant_info?: SeatOccupantInfo;  <-- We will no longer rely on this in the dialog.
}

interface DBSeatSection {
  id: number;
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
}

interface FloorManagerProps {
  onRefreshData: () => void;
  onTabChange: (tab: string) => void;
}

// For bounding presets
const LAYOUT_PRESETS = {
  auto:   { width: 0,    height: 0,    seatScale: 1.0 },
  small:  { width: 1200, height: 800,  seatScale: 1.0 },
  medium: { width: 2000, height: 1200, seatScale: 1.0 },
  large:  { width: 3000, height: 1800, seatScale: 1.0 },
};

/** Wizard state for seating/reserving seats. */
interface SeatWizardState {
  occupantType: 'reservation' | 'waitlist' | null;
  occupantId: number | null;
  occupantName: string;
  occupantPartySize: number;
  active: boolean;
  selectedSeatIds: number[];
}

export default function FloorManager({
  onRefreshData,
  onTabChange,
}: FloorManagerProps) {
  const [allLayouts, setAllLayouts]         = useState<LayoutData[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [layout, setLayout]                 = useState<LayoutData | null>(null);
  const [loading, setLoading]               = useState(true);

  // The date-based data we fetch from the server
  const [dateReservations,    setDateReservations]    = useState<Reservation[]>([]);
  const [dateWaitlist,        setDateWaitlist]        = useState<WaitlistEntry[]>([]);
  const [dateSeatAllocations, setDateSeatAllocations] = useState<SeatAllocation[]>([]);

  // The user-selected date
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // "YYYY-MM-DD"
  });

  // Seat detail dialog
  const [selectedSeat, setSelectedSeat]   = useState<DBSeat | null>(null);
  const [showSeatDialog, setShowSeatDialog] = useState(false);

  // Wizard
  const [seatWizard, setSeatWizard] = useState<SeatWizardState>({
    occupantType: null,
    occupantId: null,
    occupantName: '',
    occupantPartySize: 1,
    active: false,
    selectedSeatIds: [],
  });

  // Occupant pick modal
  const [showPickOccupantModal, setShowPickOccupantModal] = useState(false);
  const [pickOccupantValue, setPickOccupantValue]         = useState('');

  // Canvas sizing & zoom
  const [layoutSize, setLayoutSize]     = useState<'auto'|'small'|'medium'|'large'>('medium');
  const [canvasWidth, setCanvasWidth]   = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [seatScale, setSeatScale]       = useState(1.0);
  const [zoom, setZoom]                 = useState(1.0);
  const [showGrid, setShowGrid]         = useState(true);

  /** 1. On mount, fetch all layouts, pick the first if available */
  useEffect(() => {
    initData();
  }, []);

  async function initData() {
    setLoading(true);
    try {
      const layoutResp = await axios.get<LayoutData[]>('http://localhost:3000/layouts');
      setAllLayouts(layoutResp.data);
      if (layoutResp.data.length === 0) {
        setLayout(null);
        setSelectedLayoutId(null);
      } else {
        const first = layoutResp.data[0];
        setSelectedLayoutId(first.id);
        // fetch the layout plus date-based data
        await fetchLayoutAndDateData(first.id, selectedDate);
      }
    } catch (err) {
      console.error('Error fetching layouts:', err);
      setLayout(null);
    } finally {
      setLoading(false);
    }
  }

  /** 2. Whenever user picks a layout, load that layout plus the date's data */
  async function handleSelectLayout(id: number) {
    setSelectedLayoutId(id);
    await fetchLayoutAndDateData(id, selectedDate);
  }

  /** 3. Whenever the user changes the date, re-fetch reservations/waitlist/allocations for that date. */
  useEffect(() => {
    if (!selectedLayoutId) return;
    fetchLayoutAndDateData(selectedLayoutId, selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  /** Single helper that fetches:
   *  - the given layout,
   *  - reservations?date=YYYY-MM-DD,
   *  - waitlist_entries?date=YYYY-MM-DD,
   *  - seat_allocations?date=YYYY-MM-DD
   */
  async function fetchLayoutAndDateData(layoutId: number, dateStr: string) {
    setLoading(true);
    try {
      // 1) fetch layout (all seats)
      const layoutRes = await axios.get<LayoutData>(`http://localhost:3000/layouts/${layoutId}`);
      setLayout(layoutRes.data);

      // 2) fetch reservations for that date
      const resResp = await axios.get<Reservation[]>(`http://localhost:3000/reservations?date=${dateStr}`);
      setDateReservations(resResp.data);

      // 3) fetch waitlist entries for that date
      const waitResp = await axios.get<WaitlistEntry[]>(`http://localhost:3000/waitlist_entries?date=${dateStr}`);
      setDateWaitlist(waitResp.data);

      // 4) fetch seat allocations for that date
      const allocResp = await axios.get<SeatAllocation[]>(`http://localhost:3000/seat_allocations?date=${dateStr}`);
      setDateSeatAllocations(allocResp.data);

    } catch (err) {
      console.error('Error fetching layout+date data:', err);
      setLayout(null);
      setDateReservations([]);
      setDateWaitlist([]);
      setDateSeatAllocations([]);
    } finally {
      setLoading(false);
    }
  }

  /** A manual refresh call if needed (e.g. after seat wizard completes) */
  async function refreshLayout() {
    if (!selectedLayoutId) return;
    await fetchLayoutAndDateData(selectedLayoutId, selectedDate);
    onRefreshData(); // optional
  }

  /** 4. Whenever layout changes, do bounding logic for seat arrangement. */
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
    seatSections.forEach(sec => {
      sec.seats.forEach(seat => {
        const gx = sec.offset_x + seat.position_x;
        const gy = sec.offset_y + seat.position_y;
        if (gx < minX) minX = gx;
        if (gx > maxX) maxX = gx;
        if (gy < minY) minY = gy;
        if (gy > maxY) maxY = gy;
      });
    });
    const margin = 200;
    const w = maxX - minX + margin;
    const h = maxY - minY + margin;
    setCanvasWidth(Math.max(w, 800));
    setCanvasHeight(Math.max(h, 600));
    setSeatScale(1.0);
  }

  /** 5. getOccupantInfo => look in dateSeatAllocations (which is date‐filtered). */
  function getOccupantInfo(seatId: number): SeatOccupantInfo | undefined {
    const alloc = dateSeatAllocations.find(a => a.seat_id === seatId && !a.released_at);
    if (!alloc || !alloc.occupant_id) return undefined;
    return {
      occupant_type: alloc.occupant_type,
      occupant_id: alloc.occupant_id,
      occupant_name: alloc.occupant_name,
      occupant_party_size: alloc.occupant_party_size,
      occupant_status: alloc.occupant_status,
    };
  }

  /** 6. seat click & wizard */
  function handleSeatClick(seat: DBSeat) {
    const occupant = getOccupantInfo(seat.id);
    const isFreeThisDate = !occupant;

    if (seatWizard.active) {
      // We’re in the middle of seat selection
      const alreadySelected = seatWizard.selectedSeatIds.includes(seat.id);
      if (!alreadySelected && !isFreeThisDate) {
        alert(`Seat #${seat.label || seat.id} is not free for ${selectedDate}.`);
        return;
      }
      if (!alreadySelected && seatWizard.selectedSeatIds.length >= seatWizard.occupantPartySize) {
        alert(`You need exactly ${seatWizard.occupantPartySize} seat(s).`);
        return;
      }
      toggleSelectedSeat(seat.id);
    } else {
      // Just open the seat detail dialog
      setSelectedSeat(seat);
      setShowSeatDialog(true);
    }
  }

  function toggleSelectedSeat(seatId: number) {
    setSeatWizard(prev => {
      const included = prev.selectedSeatIds.includes(seatId);
      const newSelected = included
        ? prev.selectedSeatIds.filter(id => id !== seatId)
        : [...prev.selectedSeatIds, seatId];
      return { ...prev, selectedSeatIds: newSelected };
    });
  }

  function handleCloseSeatDialog() {
    setSelectedSeat(null);
    setShowSeatDialog(false);
  }

  function startWizardForFreeSeat(seatId: number) {
    setSeatWizard({
      occupantType: null,
      occupantId: null,
      occupantName: '',
      occupantPartySize: 1,
      active: true,
      selectedSeatIds: [seatId],
    });
    handlePickOccupantOpen();
  }

  /** 7. occupant pick => wizard */
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
    let occupantNameFull  = 'Guest';

    if (typeStr === 'reservation') {
      const found = dateReservations.find(r => r.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantNameFull  = found.contact_name ?? 'Guest';
      }
    } else {
      // waitlist
      const found = dateWaitlist.find(w => w.id === occupantId);
      if (found) {
        occupantPartySize = found.party_size ?? 1;
        occupantNameFull  = found.contact_name ?? 'Guest';
      }
    }

    const occupantName = occupantNameFull.split(/\s+/)[0];
    setSeatWizard(prev => ({
      ...prev,
      occupantType: typeStr as 'reservation' | 'waitlist',
      occupantId,
      occupantName,
      occupantPartySize,
      active: true,
    }));
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

  /** 8. seat allocation calls */
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
    } catch (err) {
      console.error('Failed to reserve occupant seats:', err);
      alert('Reserve occupant error—check console.');
    }
  }

  async function handleFinishOccupant(occupantType: string, occupantId: number) {
    try {
      await axios.post('http://localhost:3000/seat_allocations/finish', {
        occupant_type: occupantType,
        occupant_id: occupantId,
      });
      handleCloseSeatDialog();
      await refreshLayout();
    } catch (err) {
      console.error('Finish occupant error:', err);
      alert('Finish occupant error—check console.');
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
    } catch (err) {
      console.error('No-show occupant error:', err);
      alert('No-show occupant error—check console.');
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
    } catch (err) {
      console.error('Arrive occupant error:', err);
      alert('Arrive occupant error—check console.');
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
    } catch (err) {
      console.error('Cancel occupant error:', err);
      alert('Cancel occupant error—check console.');
    }
  }

  // ---------------------------
  // Rendering
  // ---------------------------
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

  // Filter to only “booked” reservations, “waiting” waitlist if you like
  const seatableReservations = dateReservations.filter(r => r.status === 'booked');
  const seatableWaitlist     = dateWaitlist.filter(w => w.status === 'waiting');

  const sections = layout.seat_sections || [];
  const seatDiameterBase = 60;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Floor Manager</h2>

      {/* ---------- Single row with Date + Layout + Size + Grid + Zoom ---------- */}
      <div className="flex items-center space-x-4 mb-4">
        {/* Date Picker */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded p-1"
          />
        </div>

        {/* Layout selection */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Layout:</label>
          <select
            value={selectedLayoutId ?? ''}
            onChange={e => handleSelectLayout(Number(e.target.value))}
            className="border border-gray-300 rounded p-1"
          >
            <option value="">-- Choose Layout --</option>
            {allLayouts.map(ld => (
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
            onChange={e => setLayoutSize(e.target.value as 'auto'|'small'|'medium'|'large')}
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
            onClick={() => setZoom(z => Math.max(z - 0.25, 0.2))}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(z + 0.25, 5.0))}
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

      {/* ---------- Seat Wizard ---------- */}
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

          {seatWizard.occupantType === 'reservation' && (
            <button
              onClick={handleReserveSeats}
              className="px-4 py-2 bg-orange-600 text-white rounded"
            >
              Reserve Seats
            </button>
          )}
          <button
            onClick={handleCancelWizard}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ---------- Canvas Area ---------- */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: 600 }}
      >
        <div
          style={{
            position: 'relative',
            width:  canvasWidth,
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
          {layout.seat_sections?.map((section) => (
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

              {section.seats.map((seat, idx) => {
                const keyVal = seat.id ? `seat-${seat.id}` : `temp-${idx}`;
                // Position seat
                const seatX = seat.position_x - (seatDiameterBase / 2);
                const seatY = seat.position_y - (seatDiameterBase / 2);

                const occupant = getOccupantInfo(seat.id);
                const occupantStatus = occupant?.occupant_status;

                const isSelected = seatWizard.selectedSeatIds.includes(seat.id);
                let seatColor = 'bg-green-500';

                if (seatWizard.active && isSelected) {
                  seatColor = 'bg-blue-500';
                } else if (occupantStatus === 'reserved') {
                  seatColor = 'bg-yellow-400';
                } else if (
                  occupantStatus === 'occupied' ||
                  occupantStatus === 'seated'
                ) {
                  seatColor = 'bg-red-500';
                } else {
                  seatColor = 'bg-green-500';
                }

                // occupant name if allocated, else seat label
                const occupantDisplay = occupant?.occupant_name
                  || seat.label
                  || `Seat ${seat.id}`;

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
          ))}
        </div>
      </div>

      {/* ---------- Reservations & Waitlist (date-based) ---------- */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Reservations */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Reservations</h3>
          <ul className="space-y-2">
            {dateReservations.map(res => {
              const t = res.start_time
                ? new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const firstName = res.contact_name?.split(' ')[0] || 'Guest';
              return (
                <li
                  key={`res-${res.id}`}
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
            {dateWaitlist.map(wl => {
              const t = wl.check_in_time
                ? new Date(wl.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const firstName = wl.contact_name?.split(' ')[0] || 'Guest';
              return (
                <li
                  key={`wl-${wl.id}`}
                  className="bg-gray-50 p-2 rounded hover:bg-gray-100 text-sm"
                >
                  <div className="font-semibold">{firstName}</div>
                  <div className="text-xs text-gray-600">
                    Party: {wl.party_size}, {wl.contact_phone}
                  </div>
                  {t && <div className="text-xs text-blue-500">Checked in: {t}</div>}
                  <div className="text-xs text-gray-500">Status: {wl.status}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ---------- Seat Detail Dialog (FIXED) ---------- */}
      {showSeatDialog && selectedSeat && (() => {
        // Get occupant info *for this date*:
        const occupant = getOccupantInfo(selectedSeat.id);

        if (occupant?.occupant_status === 'reserved') {
          return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded shadow w-96 relative">
                <button
                  onClick={handleCloseSeatDialog}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
                <h3 className="font-bold text-lg mb-2">Seat Reserved</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Reserved by{' '}
                  <strong>
                    {occupant.occupant_name || 'someone'} (Party of{' '}
                    {occupant.occupant_party_size ?? 1})
                  </strong>
                </p>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      handleArriveOccupant(
                        occupant.occupant_type || 'reservation',
                        occupant.occupant_id || 0
                      );
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Seat This Party
                  </button>
                  <button
                    onClick={() => {
                      handleNoShow(
                        occupant.occupant_type || 'reservation',
                        occupant.occupant_id || 0
                      );
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Mark No-Show
                  </button>
                  <button
                    onClick={() => {
                      handleCancelOccupant(
                        occupant.occupant_type || 'reservation',
                        occupant.occupant_id || 0
                      );
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel Reservation
                  </button>
                </div>
              </div>
            </div>
          );
        } else if (
          occupant?.occupant_status === 'occupied' ||
          occupant?.occupant_status === 'seated'
        ) {
          return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded shadow w-96 relative">
                <button
                  onClick={handleCloseSeatDialog}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
                <h3 className="font-bold text-lg mb-2">Seat Occupied</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Occupied by{' '}
                  <strong>
                    {occupant.occupant_name || 'someone'} (Party of{' '}
                    {occupant.occupant_party_size ?? 1})
                  </strong>
                </p>
                <button
                  onClick={() => {
                    handleFinishOccupant(
                      occupant.occupant_type || 'reservation',
                      occupant.occupant_id || 0
                    );
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Finish / Free Seat
                </button>
              </div>
            </div>
          );
        } else {
          // No occupant found => seat is free for this date
          return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded shadow w-96 relative">
                <button
                  onClick={handleCloseSeatDialog}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>
                <h3 className="font-bold text-lg mb-2">Seat Is Free</h3>
                <p className="text-sm text-gray-600 mb-2">
                  This seat is currently free for {selectedDate}.
                  {seatWizard.active
                    ? ' You can also toggle it in the wizard.'
                    : ' You can seat or reserve a party here.'}
                </p>
                {!seatWizard.active && (
                  <button
                    onClick={() => {
                      startWizardForFreeSeat(selectedSeat.id);
                      handleCloseSeatDialog();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Seat/Reserve Now
                  </button>
                )}
              </div>
            </div>
          );
        }
      })()}

      {/* ---------- Pick Occupant Modal ---------- */}
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
              onChange={e => setPickOccupantValue(e.target.value)}
            >
              <option value="">-- Choose occupant --</option>

              <optgroup label="Reservations (booked)">
                {dateReservations.filter(r => r.status === 'booked').map(r => (
                  <option key={`res-${r.id}`} value={`reservation-${r.id}`}>
                    {r.contact_name?.split(' ')[0] || 'Guest'} (Party of {r.party_size})
                  </option>
                ))}
              </optgroup>

              <optgroup label="Waitlist (waiting)">
                {dateWaitlist.filter(w => w.status === 'waiting').map(wl => (
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
