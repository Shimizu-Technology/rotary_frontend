import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Save, Trash2, Plus as LucidePlus, Settings, Edit2,
  Minus, Maximize
} from 'lucide-react';

/** ---------- Data Interfaces ---------- **/

interface LayoutData {
  id: number;
  name: string;
  restaurant_id: number;
  sections_data: {
    sections: SeatSection[];
  };
}

/** 
 * We’ll store seats locally. 
 * `id` is optional if not saved, but you can keep it if loading an existing layout.
 */
interface DBSeat {
  id?: number; 
  seat_section_id?: number; 
  label?: string;         
  position_x: number;
  position_y: number;
  status: string;         
  capacity: number;
}

/** 
 * We keep an optional `dbId` if you load an existing seat_section from DB. 
 * For brand-new sections that are not saved yet, `dbId` is undefined. 
 */
interface SeatSection {
  id: string;       // local identifier, e.g. "section-1"
  dbId?: number;    // actual seat_sections.id if loaded from DB

  name: string;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
  offsetX: number;
  offsetY: number;
  seats: DBSeat[];
}

interface SectionConfig {
  name: string;
  seatCount: number;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
}

/** “auto” (compute bounding box) or preset canvas sizes. */
const LAYOUT_PRESETS = {
  auto:    { width: 0,    height: 0,    seatScale: 1.0 },
  small:   { width: 1200, height: 800,  seatScale: 1.0 },
  medium:  { width: 2000, height: 1200, seatScale: 1.0 },
  large:   { width: 3000, height: 1800, seatScale: 1.0 },
};

/** Extract numeric portion of "Seat #12" => 12; returns 0 if no digits found. */
function seatLabelToNumber(label?: string): number {
  if (!label) return 0;
  const match = label.match(/#(\d+)/);
  if (!match) return 0;
  return parseInt(match[1], 10) || 0;
}

/** 
 * Determine spacing between the last two seats in seatsAsc, 
 * or fall back to defaultSpacing if <2 seats exist.
 */
function measureExistingGap(
  seatsAsc: DBSeat[],
  orientation: 'vertical' | 'horizontal',
  defaultSpacing = 70
): number {
  if (seatsAsc.length < 2) {
    return defaultSpacing;
  }
  const secondLast = seatsAsc[seatsAsc.length - 2];
  const last = seatsAsc[seatsAsc.length - 1];

  if (orientation === 'vertical') {
    const diff = last.position_y - secondLast.position_y;
    return diff <= 5 ? defaultSpacing : diff;
  } else {
    const diff = last.position_x - secondLast.position_x;
    return diff <= 5 ? defaultSpacing : diff;
  }
}

/** ---------- Main Component ---------- **/
export default function SeatLayoutEditor() {
  // All available layouts from DB (optional if you let users pick existing)
  const [allLayouts, setAllLayouts] = useState<LayoutData[]>([]);

  // Currently active layout
  const [activeLayoutId, setActiveLayoutId] = useState<number | null>(null);
  const [layoutName, setLayoutName] = useState('New Layout');

  // In-memory seat sections (NOT saved until user presses "Save Layout")
  const [sections, setSections] = useState<SeatSection[]>([]);

  // Layout sizing
  const [layoutSize, setLayoutSize] = useState<'auto'|'small'|'medium'|'large'>('medium');
  const [canvasWidth, setCanvasWidth]   = useState(2000);
  const [canvasHeight, setCanvasHeight] = useState(1200);
  const [seatScale, setSeatScale]       = useState(1.0);

  // Zoom
  const [zoom, setZoom] = useState(1.0);

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragStart, setDragStart]   = useState<{ x: number; y: number } | null>(null);

  const [showGrid, setShowGrid] = useState(true);

  // Section dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSectionId, setEditingSectionId]   = useState<string | null>(null);
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    name: '',
    seatCount: 4,
    type: 'counter',
    orientation: 'vertical',
  });
  const [seatCapacity, setSeatCapacity] = useState(1);

  /** 
   * 1) On mount, optionally load existing layouts from DB. 
   *    If you don't need this, you can remove it.
   */
  useEffect(() => {
    async function loadLayouts() {
      try {
        const resp = await axios.get<LayoutData[]>('http://localhost:3000/layouts');
        setAllLayouts(resp.data);
        // Optionally auto-select the first layout
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

  /** Whenever sections or layoutSize changes, recalc the canvas size if layoutSize=auto. */
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

  /** Let user pick an existing layout from a dropdown (optional). */
  function handleSelectLayout(id: number) {
    setActiveLayoutId(id);
    const layout = allLayouts.find((l) => l.id === id);
    if (layout) {
      setLayoutName(layout.name || 'Untitled Layout');
      setSections(layout.sections_data.sections || []);
    }
  }

  /** ---------- Drag/Drop seat sections in local state ---------- */
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

  /** ---------- Add/Edit Sections in local state ---------- */
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

  /** 
   * Create or edit a section purely in local state (no immediate DB calls).
   */
  async function createOrEditSection() {
    if (editingSectionId) {
      // ----- 1) Updating an existing section locally
      const oldSection = sections.find((s) => s.id === editingSectionId);
      if (!oldSection) {
        setShowSectionDialog(false);
        return;
      }

      const oldCount = oldSection.seats.length;
      const newCount = sectionConfig.seatCount;

      // Update the basic fields
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

      // If seatCount increased => create new seats (in local state)
      if (newCount > oldCount) {
        const seatsToAdd = newCount - oldCount;
        const seatsAsc = [...oldSection.seats].sort(
          (a, b) => seatLabelToNumber(a.label) - seatLabelToNumber(b.label)
        );

        let maxLabelNum = 0;
        let anchorX = 0;
        let anchorY = 0;
        if (seatsAsc.length > 0) {
          const lastSeatAsc = seatsAsc[seatsAsc.length - 1];
          maxLabelNum = seatLabelToNumber(lastSeatAsc.label);
          anchorX = lastSeatAsc.position_x;
          anchorY = lastSeatAsc.position_y;
        }
        const gap = measureExistingGap(seatsAsc, sectionConfig.orientation, 70);

        const newSeats: DBSeat[] = [];
        for (let i = 1; i <= seatsToAdd; i++) {
          const newLabelNum = maxLabelNum + i;
          let overrideX = anchorX;
          let overrideY = anchorY;

          if (sectionConfig.orientation === 'vertical') {
            overrideY += gap * i;
          } else {
            overrideX += gap * i;
          }

          newSeats.push({
            label: `Seat #${newLabelNum}`,
            position_x: overrideX,
            position_y: overrideY,
            status: 'free',
            capacity: seatCapacity,
          });
        }

        // Merge them into local state
        setSections((prev) =>
          prev.map((sec) => {
            if (sec.id !== editingSectionId) return sec;
            return { ...sec, seats: [...sec.seats, ...newSeats] };
          })
        );
      }
      // If seatCount decreased => remove seats from the top
      else if (newCount < oldCount) {
        const seatsToRemove = oldCount - newCount;
        const seatsDesc = [...oldSection.seats].sort(
          (a, b) => seatLabelToNumber(b.label) - seatLabelToNumber(a.label)
        );
        const toRemove = seatsDesc.slice(0, seatsToRemove);

        setSections((prev) =>
          prev.map((sec) => {
            if (sec.id !== editingSectionId) return sec;
            return {
              ...sec,
              seats: sec.seats.filter((s) => !toRemove.includes(s)),
            };
          })
        );
      }
    } else {
      // ----- 2) brand new section in local state
      const newSectionId = `section-${sections.length + 1}`;

      // Create seats for that section
      const newSeats: DBSeat[] = [];
      for (let i = 0; i < sectionConfig.seatCount; i++) {
        // simple logic for positioning
        const spacing = 70;
        let position_x = 0;
        let position_y = 0;
        if (sectionConfig.type === 'counter') {
          if (sectionConfig.orientation === 'vertical') {
            position_y = i * spacing;
          } else {
            position_x = i * spacing;
          }
        } else {
          // "table" => 2D arrangement
          if (sectionConfig.orientation === 'vertical') {
            const cols = 2;
            const colIndex = i % cols;
            const rowIndex = Math.floor(i / cols);
            position_x = colIndex * spacing;
            position_y = rowIndex * spacing;
          } else {
            const rows = 2;
            const rowIndex = i % rows;
            const colIndex = Math.floor(i / rows);
            position_x = colIndex * spacing;
            position_y = rowIndex * spacing;
          }
        }

        newSeats.push({
          label: `Seat #${i + 1}`,
          position_x,
          position_y,
          status: 'free',
          capacity: seatCapacity,
        });
      }

      const newSec: SeatSection = {
        id: newSectionId,
        name: sectionConfig.name,
        type: sectionConfig.type,
        orientation: sectionConfig.orientation,
        offsetX: 100,
        offsetY: 100,
        seats: newSeats,
      };

      setSections((prev) => [...prev, newSec]);
    }
    setShowSectionDialog(false);
  }

  /** Remove an entire section from local state. */
  function deleteSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  /** ---------- 4) Save entire layout to server (one request) ---------- */
  async function handleSaveLayout() {
    try {
      // Everything is in local 'sections' state. 
      // We create a single payload to send to the server:
      const payload = {
        layout: {
          name: layoutName,
          sections_data: { sections },
        },
      };

      // If updating existing layout
      if (activeLayoutId) {
        await axios.patch(`http://localhost:3000/layouts/${activeLayoutId}`, payload);
        alert('Layout updated successfully!');
      } else {
        // Creating a new layout in the DB
        const resp = await axios.post('http://localhost:3000/layouts', payload);
        alert('Layout created successfully!');
        const newLayout = resp.data as LayoutData;
        // Store it in the "allLayouts" so user can pick it again
        setAllLayouts((prev) => [...prev, newLayout]);
        setActiveLayoutId(newLayout.id);
      }
    } catch (err) {
      console.error('Error saving layout:', err);
      alert('Failed to save layout—check console.');
    }
  }

  /** ---------- 5) Zoom controls ---------- */
  function handleZoomIn() {
    setZoom((prev) => Math.min(prev + 0.25, 5.0));
  }
  function handleZoomOut() {
    setZoom((prev) => Math.max(prev - 0.25, 0.2));
  }
  function handleZoomReset() {
    setZoom(1.0);
  }

  /** ---------- Render the Editor ---------- **/
  return (
    <div className="relative px-4 pb-6">
      {/* ---------- Top Controls ---------- */}
      <div className="mb-4 flex items-center space-x-4">
        
        {/* Layout dropdown (optional) */}
        <div>
          <label className="mr-2 text-sm font-semibold">Choose Layout:</label>
          <select
            value={activeLayoutId ?? ''}
            onChange={(e) => handleSelectLayout(Number(e.target.value))}
            className="border border-gray-300 rounded p-1"
          >
            <option value="">(New Layout)</option>
            {allLayouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </div>

        {/* Layout name */}
        <input
          type="text"
          value={layoutName}
          onChange={(e) => setLayoutName(e.target.value)}
          className="border border-gray-300 rounded p-1"
          placeholder="Layout Name"
        />

        {/* Layout size */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Layout Size:</label>
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

      {/* ---------- Scrollable container ---------- */}
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

              {/* Seats in this section */}
              <div style={{ position: 'relative' }}>
                {section.seats.map((seat, idx) => {
                  const seatDiameter = 64 * seatScale;
                  const seatX = seat.position_x * seatScale;
                  const seatY = seat.position_y * seatScale;

                  let seatColor = 'bg-green-500'; // free
                  if (seat.status === 'occupied') seatColor = 'bg-red-500';
                  if (seat.status === 'reserved') seatColor = 'bg-yellow-400';

                  return (
                    <div
                      key={idx}
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
                        console.log('Clicked seat:', seat.label);
                      }}
                    >
                      {seat.label ?? `Seat`}
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
              {/* Name */}
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

              {/* Type */}
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
