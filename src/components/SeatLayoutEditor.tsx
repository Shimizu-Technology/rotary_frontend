// src/components/SeatLayoutEditor.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Trash2, Plus, Settings, Edit2 } from 'lucide-react';

interface LayoutData {
  id: number;
  name: string;
  restaurant_id: number;
  sections_data: {
    sections: SeatSection[];
  };
}

interface DBSeat {
  id: number;
  seat_section_id: number;
  label?: string;
  position_x: number;
  position_y: number;
  status: string;         // "free" or "occupied"
  capacity: number;
}

interface SeatSection {
  id: string;
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

const LAYOUT_PRESETS = {
  large: { width: 1200, height: 800, seatScale: 0.8 },
  medium: { width: 2000, height: 1200, seatScale: 1 },
  small: { width: 3000, height: 1800, seatScale: 1.2 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function SeatLayoutEditor() {
  const [allLayouts, setAllLayouts] = useState<LayoutData[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<number | null>(null);

  const [sections, setSections] = useState<SeatSection[]>([]);
  const [layoutName, setLayoutName] = useState('New Layout');

  const [layoutSize, setLayoutSize] = useState<'small'|'medium'|'large'>('medium');
  const { width: canvasWidth, height: canvasHeight, seatScale } = LAYOUT_PRESETS[layoutSize];

  const [isDragging, setIsDragging] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const [showGrid, setShowGrid] = useState(true);

  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    name: '',
    seatCount: 4,
    type: 'counter',
    orientation: 'vertical',
  });
  const [seatCapacity, setSeatCapacity] = useState<number>(1);

  // 1) Load all layouts on mount
  useEffect(() => {
    async function loadLayouts() {
      try {
        const resp = await axios.get<LayoutData[]>('http://localhost:3000/layouts');
        setAllLayouts(resp.data);

        if (resp.data.length > 0) {
          const first = resp.data[0];
          setActiveLayoutId(first.id);
          setLayoutName(first.name || 'Untitled Layout');
          if (first.sections_data?.sections) {
            setSections(first.sections_data.sections);
          }
        }
      } catch (err) {
        console.error('Error loading layouts:', err);
      }
    }
    loadLayouts();
  }, []);

  function handleSelectLayout(id: number) {
    setActiveLayoutId(id);
    const layout = allLayouts.find((l) => l.id === id);
    if (layout) {
      setLayoutName(layout.name);
      const s = layout.sections_data?.sections || [];
      setSections(s);
    }
  }

  // 2) Drag & drop
  function handleDragStart(e: React.MouseEvent, sectionId: string) {
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

        const newOffsetX = sec.offsetX + dx;
        const newOffsetY = sec.offsetY + dy;

        const { minX, maxX, minY, maxY } = getSectionBounds(sec, seatScale);
        const minAllowedX = -minX;
        const maxAllowedX = canvasWidth - maxX;
        const minAllowedY = -minY;
        const maxAllowedY = canvasHeight - maxY;

        return {
          ...sec,
          offsetX: clamp(newOffsetX, minAllowedX, maxAllowedX),
          offsetY: clamp(newOffsetY, minAllowedY, maxAllowedY),
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

  function getSectionBounds(section: SeatSection, scale: number) {
    if (!section.seats || section.seats.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    section.seats.forEach((seat) => {
      const seatX = seat.position_x * scale;
      const seatY = seat.position_y * scale;
      if (seatX < minX) minX = seatX;
      if (seatX > maxX) maxX = seatX;
      if (seatY < minY) minY = seatY;
      if (seatY > maxY) maxY = seatY;
    });

    const seatRadius = 32 * scale;  // bigger seat circle
    minX -= seatRadius;
    maxX += seatRadius;
    minY -= seatRadius;
    maxY += seatRadius;
    return { minX, maxX, minY, maxY };
  }

  // 3) Add/Edit a section
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

  async function createOrEditSection() {
    if (editingSectionId) {
      // just rename/re-type existing seats
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
    } else {
      // brand new => create seats in DB => store IDs
      const newSectionId = `section-${sections.length + 1}`;
      const newSeats: DBSeat[] = [];

      for (let i = 0; i < sectionConfig.seatCount; i++) {
        const seatPayload = await createSeatOnServer({
          seat_section_id: 1, // or dynamic
          label: `Seat #${i + 1}`,
          index: i,
          orientation: sectionConfig.orientation,
          type: sectionConfig.type,
          capacity: seatCapacity,
        });
        newSeats.push(seatPayload);
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

  function deleteSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  interface CreateSeatParams {
    seat_section_id: number;
    label: string;
    index: number;
    orientation: 'vertical' | 'horizontal';
    type: 'counter' | 'table';
    capacity: number;
  }
  async function createSeatOnServer({
    seat_section_id,
    label,
    index,
    orientation,
    type,
    capacity,
  }: CreateSeatParams): Promise<DBSeat> {
    const spacing = 70; // a bit more spacing
    let position_x = 0;
    let position_y = 0;

    if (type === 'counter') {
      if (orientation === 'vertical') {
        position_y = index * spacing;
      } else {
        position_x = index * spacing;
      }
    } else {
      // table => 2D arrangement
      if (orientation === 'vertical') {
        const cols = 2;
        const colIndex = index % cols;
        const rowIndex = Math.floor(index / cols);
        position_x = colIndex * spacing;
        position_y = rowIndex * spacing;
      } else {
        const rows = 2;
        const rowIndex = index % rows;
        const colIndex = Math.floor(index / rows);
        position_x = colIndex * spacing;
        position_y = rowIndex * spacing;
      }
    }

    const resp = await axios.post<DBSeat>('http://localhost:3000/seats', {
      seat: {
        seat_section_id,
        label,
        position_x,
        position_y,
        status: 'free',
        capacity,
      },
    });
    return resp.data;
  }

  // 4) Save layout to DB
  async function handleSaveLayout() {
    try {
      const payload = {
        name: layoutName,
        sections_data: { sections },
      };
      if (activeLayoutId) {
        await axios.patch(`http://localhost:3000/layouts/${activeLayoutId}`, {
          layout: payload,
        });
        alert('Layout updated successfully!');
      } else {
        const resp = await axios.post('http://localhost:3000/layouts', {
          layout: payload,
        });
        alert('Layout created successfully!');
        const newLayout = resp.data as LayoutData;
        setAllLayouts((prev) => [...prev, newLayout]);
        setActiveLayoutId(newLayout.id);
      }
    } catch (err) {
      console.error('Error saving layout:', err);
      alert('Failed to save layout—check console.');
    }
  }

  return (
    <div className="relative">
      {/* Top Controls */}
      <div className="mb-4 flex items-center space-x-4">
        {/* Layout dropdown */}
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
            onChange={(e) => setLayoutSize(e.target.value as 'small'|'medium'|'large')}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
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

        {/* Save layout */}
        <button
          onClick={handleSaveLayout}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center"
        >
          <Save className="w-4 h-4 mr-1" />
          Save Layout
        </button>
      </div>

      {/* Canvas */}
      <div
        className="border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '600px' }}
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
              onMouseDown={(e) => {
                e.stopPropagation();
                handleDragStart(e, section.id);
              }}
            >
              {/* Section header */}
              <div
                className="mb-1 flex items-center justify-between bg-white/80 rounded px-2 py-1 shadow"
                style={{ position: 'relative', zIndex: 2, cursor: 'default' }}
              >
                <span className="font-medium text-sm text-gray-700">{section.name}</span>
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

              {/* Seats */}
              <div style={{ position: 'relative' }}>
                {section.seats.map((seat) => {
                  // bigger seats
                  const seatDiameter = 64 * seatScale;
                  const seatX = seat.position_x * seatScale;
                  const seatY = seat.position_y * seatScale;

                  const seatColor = seat.status === 'occupied' ? 'bg-red-500' : 'bg-green-500';
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
                        rounded-full flex items-center justify-center cursor-pointer
                        shadow-md transition-colors duration-200
                        text-white font-semibold text-sm text-center leading-tight
                        hover:opacity-90
                        ${seatColor}
                      `}
                    >
                      {seat.label ?? `Seat ${seat.id}`}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Section Button */}
      <button
        onClick={handleAddSection}
        className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-lg mt-4"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Section
      </button>

      {/* Section Dialog */}
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
                  max={50}
                  value={sectionConfig.seatCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setSectionConfig((prev) => ({ ...prev, seatCount: val }));
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              {/* Section Type */}
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
                  e.g. 1 for bar stool, 4 for a table, etc.
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
