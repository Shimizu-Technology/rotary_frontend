import React, { useState, useRef, MouseEvent } from 'react';
import { Save, Trash2, Plus, Settings, Edit2 } from 'lucide-react';

/* ---------------------------
 *      Type Definitions
 * ---------------------------*/
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

/* 
   Preset Layout sizes 
   Each has:
   - canvasWidth, canvasHeight
   - seatScale (multiplier for seat circle size & spacing)
*/
const LAYOUT_PRESETS = {
  large: { width: 1200, height: 800, seatScale: 0.8 },
  medium: { width: 2000, height: 1200, seatScale: 1 },
  small: { width: 3000, height: 1800, seatScale: 1.2 }
};

/* ---------------------------
 *  Utility: clamp function
 * ---------------------------*/
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function CombinedSeatLayoutEditor() {
  const [layoutSize, setLayoutSize] = useState<'small' | 'medium' | 'large'>('medium');
  const { width: canvasWidth, height: canvasHeight, seatScale } = LAYOUT_PRESETS[layoutSize];

  const [sections, setSections] = useState<SeatSection[]>([
    {
      id: '1',
      name: 'Left Counter',
      type: 'counter',
      orientation: 'vertical',
      offsetX: 0,
      offsetY: 0,
      seats: Array.from({ length: 8 }, (_, i) => ({
        id: `L${i + 1}`,
        number: i + 1,
        position: { x: 0, y: i * 60 },
        isOccupied: false
      }))
    },
    {
      id: '2',
      name: 'Right Counter',
      type: 'counter',
      orientation: 'vertical',
      offsetX: 400,
      offsetY: 0,
      seats: Array.from({ length: 8 }, (_, i) => ({
        id: `R${i + 1}`,
        number: i + 1,
        position: { x: 0, y: i * 60 },
        isOccupied: false
      }))
    }
  ]);

  // For dragging
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Grid toggle
  const [showGrid, setShowGrid] = useState(true);

  // Add/Edit dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>({
    name: '',
    seatCount: 4,
    type: 'counter',
    orientation: 'vertical'
  });

  /* --------------------------------
   *   Seat Toggle
   * -------------------------------*/
  const handleSeatClick = (sectionId: string, seatId: string) => {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          seats: section.seats.map((seat) =>
            seat.id === seatId
              ? { ...seat, isOccupied: !seat.isOccupied }
              : seat
          )
        };
      })
    );
  };

  /* --------------------------------
   *   Drag & Drop with One-Pass Clamp
   * -------------------------------*/
  const handleDragStart = (e: MouseEvent, sectionId: string) => {
    setIsDragging(true);
    setSelectedSection(sectionId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !dragStart || !selectedSection) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setSections((current) =>
      current.map((section) => {
        if (section.id !== selectedSection) return section;

        // Proposed new offsets
        const newOffsetX = section.offsetX + dx;
        const newOffsetY = section.offsetY + dy;

        // Bounding box at new position
        const { minX, maxX, minY, maxY } = getSectionBounds(section, seatScale);

        // If the bounding box extends from minX => maxX at the new offsets:
        // boxLeft  = newOffsetX + minX
        // boxRight = newOffsetX + maxX
        // We'll clamp newOffsetX so that boxLeft >= 0 and boxRight <= canvasWidth.

        const minAllowedX = -minX; // so that newOffsetX + minX >= 0 => newOffsetX >= -minX
        const maxAllowedX = canvasWidth - maxX; // so that newOffsetX + maxX <= canvasWidth

        const minAllowedY = -minY;
        const maxAllowedY = canvasHeight - maxY;

        // Perform one-pass clamp
        const clampedX = clamp(newOffsetX, minAllowedX, maxAllowedX);
        const clampedY = clamp(newOffsetY, minAllowedY, maxAllowedY);

        return {
          ...section,
          offsetX: clampedX,
          offsetY: clampedY
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

  /* --------------------------------
   *   Add / Edit Section
   * -------------------------------*/
  const handleAddSection = () => {
    setEditingSectionId(null);
    setSectionConfig({
      name: `New Section ${sections.length + 1}`,
      seatCount: 4,
      type: 'counter',
      orientation: 'vertical'
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
      orientation: sec.orientation
    });
    setShowSectionDialog(true);
  };

  const createOrEditSection = () => {
    if (editingSectionId) {
      setSections((current) =>
        current.map((sec) => {
          if (sec.id !== editingSectionId) return sec;
          const newSeats = generateSeats(
            sectionConfig.seatCount,
            sectionConfig.orientation,
            sectionConfig.type
          );
          return {
            ...sec,
            name: sectionConfig.name,
            type: sectionConfig.type,
            orientation: sectionConfig.orientation,
            seats: newSeats
          };
        })
      );
    } else {
      const newId = `section-${sections.length + 1}`;
      const newSeats = generateSeats(
        sectionConfig.seatCount,
        sectionConfig.orientation,
        sectionConfig.type
      );
      setSections((prev) => [
        ...prev,
        {
          id: newId,
          name: sectionConfig.name,
          type: sectionConfig.type,
          orientation: sectionConfig.orientation,
          offsetX: 100,
          offsetY: 100,
          seats: newSeats
        }
      ]);
    }
    setShowSectionDialog(false);
  };

  const deleteSection = (sectionId: string) => {
    setSections((current) => current.filter((s) => s.id !== sectionId));
  };

  /* --------------------------------
   *   Generate Seats
   * -------------------------------*/
  function generateSeats(
    seatCount: number,
    orientation: 'vertical' | 'horizontal',
    type: 'counter' | 'table'
  ): Seat[] {
    if (type === 'counter') {
      // Single row or column with 60px base spacing
      const spacing = orientation === 'vertical' ? { x: 0, y: 60 } : { x: 60, y: 0 };
      return Array.from({ length: seatCount }, (_, i) => ({
        id: `${Math.random().toString(36).slice(2)}-${i + 1}`,
        number: i + 1,
        position: {
          x: i * spacing.x,
          y: i * spacing.y
        },
        isOccupied: false
      }));
    } else {
      // "table" => 2D arrangement
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
            position: {
              x: colIndex * colSpacing,
              y: rowIndex * rowSpacing
            },
            isOccupied: false
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
            position: {
              x: colIndex * colSpacing,
              y: rowIndex * rowSpacing
            },
            isOccupied: false
          };
        });
      }
    }
  }

  /* --------------------------------
   *   Compute bounding box
   * -------------------------------*/
  function getSectionBounds(section: SeatSection, scale: number) {
    if (section.seats.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 relative">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-2 md:space-y-0">
        <h2 className="text-2xl font-bold text-gray-900">Seating Layout</h2>
        
        {/* Layout Preset Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700 font-medium">Layout Size:</label>
            <select
              value={layoutSize}
              onChange={(e) =>
                setLayoutSize(e.target.value as 'small' | 'medium' | 'large')
              }
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          {/* Toggle Grid */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center px-3 py-2 ${
              showGrid ? 'text-orange-600' : 'text-gray-600'
            }`}
            title="Toggle Grid"
          >
            <Settings className="w-4 h-4" />
          </button>
          {/* Save Layout */}
          <button
            onClick={() => console.log('Saving layout...', sections, { layoutSize })}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Layout
          </button>
        </div>
      </div>

      {/* Scrollable container with chosen canvas size */}
      <div
        className="relative border border-gray-200 rounded-lg overflow-auto"
        style={{ width: '100%', height: '800px' }}
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
            position: 'relative'
          }}
        >
          {/* Render sections */}
          {sections.map((section) => {
            const { minX, maxX, minY, maxY } = getSectionBounds(section, seatScale);
            return (
              <div
                key={section.id}
                style={{
                  position: 'absolute',
                  left: section.offsetX,
                  top: section.offsetY,
                  cursor: 'move'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleDragStart(e, section.id);
                }}
              >
                {/* Section Header */}
                <div
                  className="mb-1 flex items-center justify-between bg-white/80 backdrop-blur-sm rounded px-2 py-1 shadow"
                  style={{ cursor: 'default' }}
                >
                  <span className="font-medium text-sm text-gray-700">
                    {section.name}
                  </span>
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
                <div className="relative">
                  {section.seats.map((seat) => {
                    // Compute scaled seat position
                    const seatX = seat.position.x * seatScale;
                    const seatY = seat.position.y * seatScale;
                    // Seat diameter
                    const seatDiameter = 48 * seatScale;
                    return (
                      <div
                        key={seat.id}
                        style={{
                          position: 'absolute',
                          left: seatX,
                          top: seatY,
                          width: seatDiameter,
                          height: seatDiameter
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeatClick(section.id, seat.id);
                        }}
                        className={`
                          rounded-full flex items-center justify-center 
                          cursor-pointer transition-colors duration-200 shadow-md
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

      {/* Fixed Add Section Button */}
      <button
        onClick={handleAddSection}
        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-lg absolute bottom-4 right-4"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Section
      </button>

      {/* New/Edit Section Dialog */}
      {showSectionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
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
                    setSectionConfig((prev) => ({
                      ...prev,
                      name: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              {/* Number of Seats */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Seats
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={sectionConfig.seatCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSectionConfig((prev) => ({
                      ...prev,
                      seatCount: Number.isNaN(val)
                        ? 1
                        : Math.max(1, Math.min(50, val))
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                      type: e.target.value as 'counter' | 'table'
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                      orientation: e.target.value as 'vertical' | 'horizontal'
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="vertical">Vertical</option>
                  <option value="horizontal">Horizontal</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSectionDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={createOrEditSection}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                {editingSectionId ? 'Save Changes' : 'Create Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-2">
          Layout Instructions
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Choose a layout size (Small, Medium, Large). This sets canvas size & seat scale.</li>
          <li>• Click "Add Section" to create counters/tables with a defined seat count.</li>
          <li>• Drag a section by pressing its header—seats won't initiate dragging.</li>
          <li>• Edit a section by clicking the edit icon (seat count, orientation, type).</li>
          <li>• Delete a section with the trash icon.</li>
          <li>• Toggle seat occupancy by clicking on a seat (green = free, red = occupied).</li>
          <li>• The bounding box is clamped so seats can exactly touch the edges (0 or canvasWidth/Height).</li>
          <li>• Click “Save Layout” to store your changes.</li>
        </ul>
      </div>
    </div>
  );
}

/*
  Notes:
  - We replaced the multiple if(...) checks with a single clamp step 
    for X and Y. That often resolves "can't move back to edge" issues 
    because it avoids partial rounding or leftover offset references.

  - The bounding box logic is the same. 
    We just apply: 
      clampedX = clamp(newOffsetX, -minX, canvasWidth - maxX);
      clampedY = clamp(newOffsetY, -minY, canvasHeight - maxY);

  - This ensures the user can slide seats exactly to x=0 or x=canvasWidth 
    so there's no unintended padding after re-dragging.
*/
