// Existing types...

// Update SeatSection interface to include offset coordinates
export interface SeatSection {
  id: string;
  name: string;
  type: 'counter' | 'table';
  orientation: 'vertical' | 'horizontal';
  offsetX: number;
  offsetY: number;
  seats: {
    id: string;
    number: number;
    position: {
      x: number;
      y: number;
    };
    isOccupied: boolean;
  }[];
}