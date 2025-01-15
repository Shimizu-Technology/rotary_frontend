// src/components/SeatLayoutEditor.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Trash2, Plus, Settings, Edit2 } from 'lucide-react';

interface LayoutData {
  id: number;
  name: string;
  restaurant_id: number;
  sections_data: any;  // { sections: [...] }
}

interface Seat {
  id: string;
  number: number;
  position: { x: number; y: number };
  isOccupied: boolean;
}

interface SeatSection {
  id: string;
  name: string;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
  offsetX: number;
  offsetY: number;
  seats: Seat[];
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

  // For editing the seat sections in memory
  const [sections, setSections] = useState<SeatSection[]>([]);
  const [layoutName, setLayoutName] = useState('New Layout');
  
  const [layoutSize, setLayoutSize] = useState<'small' | 'medium' | 'large'>('medium');
  const { width: canvasWidth, height: canvasHeight, seatScale } = LAYOUT_PRESETS[layoutSize];

  // Dragging
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Show/hide grid
  const [showGrid, setShowGrid] = useState(true);

  // Add/edit section dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    name: '',
    seatCount: 4,
    type: 'counter',
    orientation: 'vertical',
  });

  // ---------------
  // On Mount: Fetch existing layouts
  // ---------------
  useEffect(() => {
    const loadLayouts = async () => {
      try {
        const resp = await axios.get<LayoutData[]>('http://localhost:3000/layouts');
        setAllLayouts(resp.data);

        // If you want to auto-load the first layout or something:
        if (resp.data.length > 0) {
          const first = resp.data[0];
          setActiveLayoutId(first.id);
          setLayoutName(first.name || 'Untitled Layout');
          if (first.sections_data?.sections) {
            setSections(first.sections_data.sections);
          }
        }
      } catch (err) {
        console.error('Error fetching layouts:', err);
      }
    };
    loadLayouts();
  }, []);

  // When user picks a different layout from the dropdown
  const handleSelectLayout = (id: number) => {
    setActiveLayoutId(id);
    const layout = allLayouts.find((l) => l.id === id);
    if (layout) {
      setLayoutName(layout.name);
      const s = layout.sections_data?.sections || [];
      setSections(s);
    }
  };

  // ---------------
  // Seat Occupancy Toggle
  // ---------------
  const handleSeatClick = (sectionId: string, seatId: string) => {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          seats: section.seats.map((seat) =>
            seat.id === seatId ? { ...seat, isOccupied: !seat.isOccupied } : seat
          ),
        };
      })
    );
  };

  // ---------------
  // Drag & drop
  // ---------------
  const handleDragStart = (e: React.MouseEvent, sectionId: string) => {
    setIsDragging(true);
    setSelectedSection(sectionId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !selectedSection) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setSections((current) =>
      current.map((section) => {
        if (section.id !== selectedSection) return section;
        // compute new offsets
        const newOffsetX = section.offsetX + dx;
        const newOffsetY = section.offsetY + dy;

        const { minX, maxX, minY, maxY } = getSectionBounds(section, seatScale);
        const minAllowedX = -minX;
        const maxAllowedX = canvasWidth - maxX;
        const minAllowedY = -minY;
        const maxAllowedY = canvasHeight - maxY;

        return {
          ...section,
          offsetX: clamp(newOffsetX, minAllowedX, maxAllowedX),
          offsetY: clamp(newOffsetY, minAllowedY, maxAllowedY),
        };
      })
    );
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setSelectedSection(null);
    setDragStart(null);
  };

  function getSectionBounds(section: SeatSection, scale: number) {
    if (section.seats.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    section.seats.forEach((seat) => {
      const seatX = seat.position.x * scale;
      const seatY = seat.position.y * scale;
      if (seatX < minX) minX = seatX;
      if (seatX > maxX) maxX = seatX;
      if (seatY < minY) minY = seatY;
      if (seatY > maxY) maxY = seatY;
    });

    const seatRadius = 24 * scale;
    minX -= seatRadius;
    maxX += seatRadius;
    minY -= seatRadius;
    maxY += seatRadius;

    return { minX, maxX, minY, maxY };
  }

  // ---------------
  // Add/Edit Section
  // ---------------
  const handleAddSection = () => {
    setEditingSectionId(null);
    setSectionConfig({
      name: `New Section ${sections.length + 1}`,
      seatCount: 4,
      type: 'counter',
      orientation: 'vertical',
    });
    setShowSectionDialog(true);
  };

  const handleEditSectionClick = (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setEditingSectionId(sectionId);
    setSectionConfig({
      name: sec.name,
      seatCount: sec.seats.length,
      type: sec.type,
      orientation: sec.orientation,
    });
    setShowSectionDialog(true);
  };

  const createOrEditSection = () => {
    if (editingSectionId) {
      // edit existing
      setSections((current) =>
        current.map((sec) => {
          if (sec.id !== editingSectionId) return sec;
          const newSeats = generateSeats(sectionConfig.seatCount, sectionConfig.orientation, sectionConfig.type);
          return {
            ...sec,
            name: sectionConfig.name,
            type: sectionConfig.type,
            orientation: sectionConfig.orientation,
            seats: newSeats,
          };
        })
      );
    } else {
      // add new
      const newId = `section-${sections.length + 1}`;
      const newSeats = generateSeats(sectionConfig.seatCount, sectionConfig.orientation, sectionConfig.type);
      setSections((prev) => [
        ...prev,
        {
          id: newId,
          name: sectionConfig.name,
          type: sectionConfig.type,
          orientation: sectionConfig.orientation,
          offsetX: 100,
          offsetY: 100,
          seats: newSeats,
        },
      ]);
    }
    setShowSectionDialog(false);
  };

  const deleteSection = (sectionId: string) => {
    setSections((current) => current.filter((s) => s.id !== sectionId));
  };

  function generateSeats(
    seatCount: number,
    orientation: 'vertical' | 'horizontal',
    type: 'counter' | 'table'
  ): Seat[] {
    if (type === 'counter') {
      const spacing = orientation === 'vertical' ? { x: 0, y: 60 } : { x: 60, y: 0 };
      return Array.from({ length: seatCount }, (_, i) => ({
        id: `${Math.random().toString(36).slice(2)}-${i + 1}`,
        number: i + 1,
        position: { x: i * spacing.x, y: i * spacing.y },
        isOccupied: false,
      }));
    } else {
      if (orientation === 'vertical') {
        const cols = 2;
        const colSpacing = 60;
        const rowSpacing = 60;
        return Array.from({ length: seatCount }, (_, i) => {
          const colIndex = i % cols;
          const rowIndex = Math.floor(i / cols);
          return {
            id: `${Math.random().toString(36).slice(2)}-${i + 1}`,
            number: i + 1,
            position: { x: colIndex * colSpacing, y: rowIndex * rowSpacing },
            isOccupied: false,
          };
        });
      } else {
        // horizontal => 2 rows
        const rows = 2;
        const colSpacing = 60;
        const rowSpacing = 60;
        return Array.from({ length: seatCount }, (_, i) => {
          const rowIndex = i % rows;
          const colIndex = Math.floor(i / rows);
          return {
            id: `${Math.random().toString(36).slice(2)}-${i + 1}`,
            number: i + 1,
            position: { x: colIndex * colSpacing, y: rowIndex * rowSpacing },
            isOccupied: false,
          };
        });
      }
    }
  }

  // ---------------
  // Actually SAVE layout to the server
  // ---------------
  const handleSaveLayout = async () => {
    try {
      const payload = {
        name: layoutName,
        sections_data: {
          sections: sections,
          // you can store more metadata if desired
        },
      };
      if (activeLayoutId) {
        // update existing
        await axios.patch(`http://localhost:3000/layouts/${activeLayoutId}`, {
          layout: payload,
        });
        alert('Layout updated successfully!');
      } else {
        // create new
        const resp = await axios.post('http://localhost:3000/layouts', {
          layout: payload,
        });
        alert('Layout created successfully!');
        // store new ID, update local state
        const newLayout = resp.data as LayoutData;
        setAllLayouts((prev) => [...prev, newLayout]);
        setActiveLayoutId(newLayout.id);
      }
    } catch (err) {
      console.error('Error saving layout:', err);
      alert('Failed to save layout—check console.');
    }
  };

  return (
    <div className="relative">
      {/* Layout selection (if multiple layouts) */}
      <div className="mb-4 flex items-center space-x-4">
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
        {/* If new layout, let user set a name */}
        <input
          type="text"
          value={layoutName}
          onChange={(e) => setLayoutName(e.target.value)}
          className="border border-gray-300 rounded p-1"
          placeholder="Layout Name"
        />

        {/* Layout Size toggle */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700 font-medium">Layout Size:</label>
          <select
            value={layoutSize}
            onChange={(e) => setLayoutSize(e.target.value as 'small' | 'medium' | 'large')}
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
          className={`px-3 py-2 rounded ${showGrid ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}
        >
          <Settings className="inline w-4 h-4 mr-1" />
          Grid
        </button>

        {/* Save Layout */}
        <button
          onClick={handleSaveLayout}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Layout
        </button>
      </div>

      {/* Seat Editor Canvas */}
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
            backgroundImage: showGrid
              ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
              : 'none',
            backgroundSize: '20px 20px',
            position: 'relative',
          }}
        >
          {sections.map((section) => {
            const { minX, maxX, minY, maxY } = getSectionBounds(section, seatScale);
            return (
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
                  className="mb-1 flex items-center justify-between bg-white/80 px-2 py-1 rounded shadow"
                  style={{ cursor: 'default' }}
                >
                  <span className="font-medium text-sm text-gray-700">{section.name}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSectionClick(section.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSection(section.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Seats */}
                <div>
                  {section.seats.map((seat) => {
                    const seatX = seat.position.x * seatScale;
                    const seatY = seat.position.y * seatScale;
                    const seatDiameter = 48 * seatScale;
                    return (
                      <div
                        key={seat.id}
                        style={{
                          position: 'absolute',
                          left: seatX,
                          top: seatY,
                          width: seatDiameter,
                          height: seatDiameter,
                        }}
                        onMouseDown={(ev) => ev.stopPropagation()}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleSeatClick(section.id, seat.id);
                        }}
                        className={`
                          rounded-full flex items-center justify-center 
                          cursor-pointer shadow-md
                          transition-colors duration-200
                          ${
                            seat.isOccupied
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }
                        `}
                      >
                        {seat.number}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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

      {/* Add/Edit Section Dialog */}
      {showSectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 relative">
            <button
              onClick={() => setShowSectionDialog(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-4">
              {editingSectionId ? 'Edit Section' : 'Add New Section'}
            </h3>
            <div className="space-y-4">
              {/* Section Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section Name
                </label>
                <input
                  type="text"
                  value={sectionConfig.name}
                  onChange={(e) =>
                    setSectionConfig((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-orange-500"
                />
              </div>
              {/* Number of Seats */}
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
                    const val = parseInt(e.target.value, 10);
                    setSectionConfig((prev) => ({
                      ...prev,
                      seatCount: Number.isNaN(val) ? 1 : Math.max(1, Math.min(50, val)),
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-orange-500"
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
                      type: e.target.value as 'counter' | 'table',
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-orange-500"
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
                      orientation: e.target.value as 'vertical' | 'horizontal',
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-orange-500"
                >
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSectionDialog(false)}
                className="px-4 py-2 bg-gray-200 rounded text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createOrEditSection}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                {editingSectionId ? 'Save Changes' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
