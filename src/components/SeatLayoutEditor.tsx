// src/components/SeatLayoutEditor.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Save, Trash2, Plus as LucidePlus, Settings, Edit2,
  Minus, Maximize
} from 'lucide-react';

/** ---------- Data Interfaces ---------- **/

// Minimal structure from /layouts. We only store minimal geometry in sections_data.
interface LayoutData {
  id: number;
  name: string;
  restaurant_id: number;
  sections_data: {
    // Optionally store seat section offsets/orientation, but NOT seat arrays
    sections: SeatSection[];
  };
}

// Each seat section’s geometry. We store local seat arrays for UI preview.
// The server uses these to create/update real DB seats (via LayoutsController#update).
interface SeatSection {
  // 'id' is a string so we can handle either numeric IDs from DB or "section-1" for new.
  id: string;       
  dbId?: number;    // Actual seat_section.id if known from DB
  name: string;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
  offsetX: number;
  offsetY: number;
  seats: DBSeat[];
}

// Minimal seat interface for local in-memory usage. 
// Real seats get created/updated in the DB via the Rails controller.
interface DBSeat {
  // 'id' can be numeric if from DB, or omitted if newly created client-side.
  id?: number;          
  label?: string;
  position_x: number;
  position_y: number;
  status: string;       // "free", "reserved", or "occupied"
  capacity: number;
}

// For our "Add/Edit Section" dialog
interface SectionConfig {
  name: string;
  seatCount: number;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
}

/** Predefined layout sizes or "auto" bounding. */
const LAYOUT_PRESETS = {
  auto:    { width: 0,    height: 0,    seatScale: 1.0 },
  small:   { width: 1200, height: 800,  seatScale: 1.0 },
  medium:  { width: 2000, height: 1200, seatScale: 1.0 },
  large:   { width: 3000, height: 1800, seatScale: 1.0 },
};

/** Extract numeric portion of e.g. "Seat #12" => 12. */
function seatLabelToNumber(label?: string): number {
  if (!label) return 0;
  const match = label.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Measure spacing between two seats to auto-position new ones. */
function measureExistingGap(
  seatsAsc: DBSeat[],
  orientation: 'vertical' | 'horizontal',
  defaultSpacing = 70
): number {
  if (seatsAsc.length < 2) return defaultSpacing;
  const secondLast = seatsAsc[seatsAsc.length - 2];
  const last       = seatsAsc[seatsAsc.length - 1];
  if (orientation === 'vertical') {
    return Math.max(defaultSpacing, last.position_y - secondLast.position_y);
  } else {
    return Math.max(defaultSpacing, last.position_x - secondLast.position_x);
  }
}

export default function SeatLayoutEditor() {
  // ---------- Layout list & active selection ----------
  const [allLayouts, setAllLayouts] = useState<LayoutData[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<number | null>(null);
  const [layoutName, setLayoutName] = useState('New Layout');

  // ---------- In-memory seat sections (with seat arrays) ----------
  const [sections, setSections] = useState<SeatSection[]>([]);

  // ---------- Canvas sizing & zoom ----------
  const [layoutSize, setLayoutSize] = useState<'auto'|'small'|'medium'|'large'>('medium');
  const [canvasWidth, setCanvasWidth]   = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(1200);
  const [seatScale, setSeatScale]       = useState(1.0);
  const [zoom, setZoom]                 = useState(1.0);
  const [showGrid, setShowGrid]         = useState(true);

  // ---------- Dragging seat sections ----------
  const [isDragging, setIsDragging]           = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragStart, setDragStart]             = useState<{ x: number; y: number } | null>(null);

  // ---------- Add/Edit Section dialog ----------
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSectionId, setEditingSectionId]   = useState<string | null>(null);
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    name: '',
    seatCount: 4,
    type: 'counter',
    orientation: 'vertical',
  });
  const [seatCapacity, setSeatCapacity] = useState(1);

  /** Load existing layouts on mount. */
  useEffect(() => {
    async function loadLayouts() {
      try {
        const resp = await axios.get<LayoutData[]>('http://localhost:3000/layouts');
        setAllLayouts(resp.data);

        // If desired: automatically select the first layout
        if (resp.data.length > 0) {
          const first = resp.data[0];
          setActiveLayoutId(first.id);
          setLayoutName(first.name || 'Untitled Layout');
          setSections(first.sections_data.sections || []);
        }
      } catch (err) {
        console.error('Error loading layouts:', err);
      }
    }
    loadLayouts();
  }, []);

  /** Recompute bounding box if layoutSize or sections changes. */
  useEffect(() => {
    if (layoutSize === 'auto') {
      computeAutoBounds();
    } else {
      const preset = LAYOUT_PRESETS[layoutSize];
      setCanvasWidth(preset.width);
      setCanvasHeight(preset.height);
      setSeatScale(preset.seatScale);
    }
  }, [layoutSize, sections]);

  function computeAutoBounds() {
    if (sections.length === 0) {
      setCanvasWidth(1200);
      setCanvasHeight(800);
      setSeatScale(1.0);
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // If you store seats locally for the UI:
    sections.forEach((sec) => {
      sec.seats.forEach((seat) => {
        const globalX = sec.offsetX + seat.position_x;
        const globalY = sec.offsetY + seat.position_y;
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

  /** Handle picking a different layout from the dropdown. */
  function handleSelectLayout(id: number) {
    if (id === 0) {
      // Creating a new layout from scratch
      setActiveLayoutId(null);
      setLayoutName('New Layout');
      setSections([]);
      return;
    }
    setActiveLayoutId(id);

    const found = allLayouts.find((l) => l.id === id);
    if (found) {
      setLayoutName(found.name || 'Untitled Layout');
      setSections(found.sections_data.sections || []);
    }
  }

  /** Drag seat sections around the canvas. */
  function handleDragStart(e: React.MouseEvent, sectionId: string) {
    e.stopPropagation();
    setIsDragging(true);
    setSelectedSection(sectionId);
    setDragStart({ x: e.clientX, y: e.clientY });
  }

  function handleDragMove(e: React.MouseEvent) {
    if (!isDragging || !dragStart || !selectedSection) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== selectedSection) return sec;
        return {
          ...sec,
          offsetX: sec.offsetX + dx,
          offsetY: sec.offsetY + dy,
        };
      })
    );
    setDragStart({ x: e.clientX, y: e.clientY });
  }

  function handleDragEnd() {
    setIsDragging(false);
    setSelectedSection(null);
    setDragStart(null);
  }

  /** ------------- Add/Edit seat sections in local memory ------------- */
  function handleAddSection() {
    setEditingSectionId(null);
    setSectionConfig({
      name: `New Section ${sections.length + 1}`,
      seatCount: 4,
      type: 'counter',
      orientation: 'vertical',
    });
    setSeatCapacity(1);
    setShowSectionDialog(true);
  }

  function handleEditSectionClick(sectionId: string) {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;

    setEditingSectionId(sectionId);
    setSectionConfig({
      name: sec.name,
      seatCount: sec.seats.length,
      type: sec.type,
      orientation: sec.orientation,
    });
    if (sec.seats.length > 0) {
      setSeatCapacity(sec.seats[0].capacity);
    } else {
      setSeatCapacity(1);
    }
    setShowSectionDialog(true);
  }

  function deleteSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  /** Create or edit a section in memory only. Real DB update happens on "Save Layout." */
  function createOrEditSection() {
    if (editingSectionId) {
      // updating existing
      const oldSection = sections.find((s) => s.id === editingSectionId);
      if (!oldSection) {
        setShowSectionDialog(false);
        return;
      }
      const oldCount = oldSection.seats.length;
      const newCount = sectionConfig.seatCount;

      // Update the section’s name/type/orientation
      setSections((prev) =>
        prev.map((sec) => {
          if (sec.id !== editingSectionId) return sec;
          return {
            ...sec,
            name: sectionConfig.name,
            type: sectionConfig.type,
            orientation: sectionConfig.orientation,
          };
        })
      );

      // If seatCount increased => add seats
      if (newCount > oldCount) {
        const seatsAsc = [...oldSection.seats].sort(
          (a, b) => seatLabelToNumber(a.label) - seatLabelToNumber(b.label)
        );
        let maxLabelNum = 0;
        let anchorX = 0, anchorY = 0;
        if (seatsAsc.length > 0) {
          const lastSeat = seatsAsc[seatsAsc.length - 1];
          maxLabelNum    = seatLabelToNumber(lastSeat.label);
          anchorX        = lastSeat.position_x;
          anchorY        = lastSeat.position_y;
        }
        const gap = measureExistingGap(seatsAsc, sectionConfig.orientation, 70);

        const seatsToAdd = newCount - oldCount;
        const newSeats: DBSeat[] = [];
        for (let i = 1; i <= seatsToAdd; i++) {
          const newLabelNum = maxLabelNum + i;
          let x = anchorX;
          let y = anchorY;
          if (sectionConfig.orientation === 'vertical') {
            y += gap * i;
          } else {
            x += gap * i;
          }
          newSeats.push({
            label: `Seat #${newLabelNum}`,
            position_x: x,
            position_y: y,
            status: 'free',
            capacity: seatCapacity,
          });
        }

        setSections((prev) =>
          prev.map((sec) => {
            if (sec.id !== editingSectionId) return sec;
            return { ...sec, seats: [...sec.seats, ...newSeats] };
          })
        );
      } 
      // If seatCount decreased => remove seats from the "top"
      else if (newCount < oldCount) {
        const seatsToRemove = oldCount - newCount;
        const seatsDesc = [...oldSection.seats].sort(
          (a, b) => seatLabelToNumber(b.label) - seatLabelToNumber(a.label)
        );
        const toRemove = seatsDesc.slice(0, seatsToRemove);

        setSections((prev) =>
          prev.map((sec) => {
            if (sec.id !== editingSectionId) return sec;
            const filtered = sec.seats.filter((s) => !toRemove.includes(s));
            return { ...sec, seats: filtered };
          })
        );
      }
    } else {
      // brand new section
      const newSectionId = `section-${sections.length + 1}`;
      const newSeats: DBSeat[] = [];

      for (let i = 0; i < sectionConfig.seatCount; i++) {
        const spacing = 70;
        let posX = 0, posY = 0;

        // If it's a "counter" type, seats in a line
        if (sectionConfig.type === 'counter') {
          if (sectionConfig.orientation === 'vertical') {
            posY = i * spacing;
          } else {
            posX = i * spacing;
          }
        } else {
          // "table" => example 2D arrangement
          if (sectionConfig.orientation === 'vertical') {
            // 2 columns
            const colIndex = i % 2;
            const rowIndex = Math.floor(i / 2);
            posX = colIndex * spacing;
            posY = rowIndex * spacing;
          } else {
            // 2 rows
            const rowIndex = i % 2;
            const colIndex = Math.floor(i / 2);
            posX = colIndex * spacing;
            posY = rowIndex * spacing;
          }
        }

        newSeats.push({
          label: `Seat #${i + 1}`,
          position_x: posX,
          position_y: posY,
          status: 'free',
          capacity: seatCapacity,
        });
      }

      const newSection: SeatSection = {
        id: newSectionId,
        name: sectionConfig.name,
        type: sectionConfig.type,
        orientation: sectionConfig.orientation,
        offsetX: 100,
        offsetY: 100,
        seats: newSeats,
      };
      setSections((prev) => [...prev, newSection]);
    }

    setShowSectionDialog(false);
  }

  /**
   * Save layout => We send the entire sections array in `sections_data`.
   * Your Rails LayoutsController#update will parse and create/update seat_sections & seats.
   */
  async function handleSaveLayout() {
    try {
      const payload = {
        name: layoutName,
        sections_data: {
          // We are sending the full seat arrays here
          // so the server can create/update seats in the DB.
          sections,
        },
      };

      if (activeLayoutId) {
        // PATCH existing layout
        const resp = await axios.patch(
          `http://localhost:3000/layouts/${activeLayoutId}`,
          { layout: payload }
        );
        alert('Layout updated successfully!');
        const updated = resp.data as LayoutData;
        // Update local state in case server modifies data
        setLayoutName(updated.name);
        setSections(updated.sections_data.sections || []);
      } else {
        // POST new layout
        const resp = await axios.post('http://localhost:3000/layouts', {
          layout: payload,
        });
        alert('Layout created!');
        const newLayout = resp.data as LayoutData;
        setAllLayouts((prev) => [...prev, newLayout]);
        setActiveLayoutId(newLayout.id);
        setLayoutName(newLayout.name);
        setSections(newLayout.sections_data.sections || []);
      }
    } catch (err) {
      console.error('Error saving layout:', err);
      alert('Failed to save layout—check console.');
    }
  }

  // ---------- Zoom controls ----------
  function handleZoomIn() {
    setZoom((prev) => Math.min(prev + 0.25, 5.0));
  }
  function handleZoomOut() {
    setZoom((prev) => Math.max(prev - 0.25, 0.2));
  }
  function handleZoomReset() {
    setZoom(1.0);
  }

  return (
    <div className="relative px-4 pb-6">
      {/* ---------- Top Controls ---------- */}
      <div className="mb-4 flex items-center space-x-4">
        {/* Layout dropdown */}
        <div>
          <label className="mr-2 text-sm font-semibold">Choose Layout:</label>
          <select
            value={activeLayoutId ?? 0}
            onChange={(e) => handleSelectLayout(Number(e.target.value))}
            className="border border-gray-300 rounded p-1"
          >
            <option value={0}>(New Layout)</option>
            {allLayouts.map((lyt) => (
              <option key={lyt.id} value={lyt.id}>
                {lyt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Layout name input */}
        <input
          type="text"
          value={layoutName}
          onChange={(e) => setLayoutName(e.target.value)}
          className="border border-gray-300 rounded p-1"
          placeholder="Layout Name"
        />

        {/* Layout size */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Layout Size:</label>
          <select
            value={layoutSize}
            onChange={(e) => setLayoutSize(e.target.value as 'auto'|'small'|'medium'|'large')}
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
            onClick={handleZoomOut} 
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button 
            onClick={handleZoomIn} 
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <LucidePlus className="w-4 h-4" />
          </button>
          <button 
            onClick={handleZoomReset} 
            className="p-1 bg-gray-100 rounded hover:bg-gray-200"
            title="Reset Zoom"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* Save layout */}
        <button
          onClick={handleSaveLayout}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center"
        >
          <Save className="w-4 h-4 mr-1" />
          Save Layout
        </button>
      </div>

      {/* ---------- Scrollable container (canvas) ---------- */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '80vh', minHeight: '600px' }}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            position: 'relative',
            backgroundImage: showGrid
              ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
              : 'none',
            backgroundSize: '20px 20px',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {sections.map((section) => (
            <div
              key={section.id}
              style={{
                position: 'absolute',
                left: section.offsetX,
                top: section.offsetY,
                cursor: 'move',
              }}
              onMouseDown={(e) => handleDragStart(e, section.id)}
            >
              {/* Section header */}
              <div
                className="mb-1 flex items-center justify-between bg-white/80 rounded px-2 py-1 shadow"
                style={{ position: 'relative', zIndex: 2, cursor: 'default' }}
              >
                <span className="font-medium text-sm text-gray-700">
                  {section.name}
                  {section.dbId ? ` (ID ${section.dbId})` : ''}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleEditSectionClick(section.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      deleteSection(section.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Local seat array for UI only; real seats => created/updated in LayoutsController */}
              <div style={{ position: 'relative' }}>
                {section.seats.map((seat, idx) => {
                  const seatDiameter = 64 * seatScale;
                  const seatX = seat.position_x * seatScale;
                  const seatY = seat.position_y * seatScale;

                  let seatColor = 'bg-green-500';
                  if (seat.status === 'occupied') seatColor = 'bg-red-500';
                  if (seat.status === 'reserved') seatColor = 'bg-yellow-400';

                  // Key: use seat.id if it’s from DB, or a temp key if newly created
                  const seatKey = seat.id != null
                    ? `seat-${seat.id}`
                    : `temp-${section.id}-${idx}`;

                  return (
                    <div
                      key={seatKey}
                      style={{
                        position: 'absolute',
                        left: seatX,
                        top: seatY,
                        width: seatDiameter,
                        height: seatDiameter,
                        zIndex: 1,
                      }}
                      className={`
                        rounded-full flex items-center justify-center cursor-pointer
                        shadow-md text-white font-semibold text-sm
                        hover:opacity-90
                        ${seatColor}
                      `}
                      onClick={() => {
                        console.log('Clicked seat:', seat.label || seat.id);
                      }}
                    >
                      {seat.label ?? 'Seat'}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add section button */}
      <button
        onClick={handleAddSection}
        className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-lg mt-4"
      >
        <LucidePlus className="w-4 h-4 mr-2" />
        Add Section
      </button>

      {/* Section dialog for create/edit */}
      {showSectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-96 relative">
            <button
              onClick={() => setShowSectionDialog(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-4">
              {editingSectionId ? 'Edit Section' : 'Add Section'}
            </h3>
            <div className="space-y-4">
              {/* Section Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Name
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={sectionConfig.name}
                  onChange={(e) =>
                    setSectionConfig((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              {/* Seat Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Seats
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={sectionConfig.seatCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setSectionConfig((prev) => ({ ...prev, seatCount: val }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              {/* Type (counter/table) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Type
                </label>
                <select
                  value={sectionConfig.type}
                  onChange={(e) =>
                    setSectionConfig((prev) => ({
                      ...prev,
                      type: e.target.value as 'counter'|'table',
                    }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="counter">Counter</option>
                  <option value="table">Table</option>
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orientation
                </label>
                <select
                  value={sectionConfig.orientation}
                  onChange={(e) =>
                    setSectionConfig((prev) => ({
                      ...prev,
                      orientation: e.target.value as 'vertical'|'horizontal',
                    }))
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </div>

              {/* Seat Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seat Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  value={seatCapacity}
                  onChange={(e) => setSeatCapacity(Number(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  e.g. 1 for a barstool, 4 for a table, etc.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowSectionDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createOrEditSection}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                {editingSectionId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
