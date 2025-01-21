// src/components/ReservationConfirmationPage.tsx
import React from 'react';
import { useLocation, Link } from 'react-router-dom';

/**
 * Renders a "Reservation Confirmed" message
 * with a more styled and larger layout.
 */
export default function ReservationConfirmationPage() {
  const location = useLocation();
  const reservation = location.state?.reservation;

  // If no reservation data is passed, show a fallback
  if (!reservation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-gray-100 px-4 py-8">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4 text-gray-900">No Reservation Data</h1>
          <p className="mb-6 text-gray-700">
            We couldn&apos;t find the reservation details. You can return to the homepage or make a new
            reservation.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2 text-white bg-orange-600 rounded-md 
                       hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 
                       transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Format date/time for "Pacific/Guam"
  const startTime = new Date(reservation.start_time);
  const dateStr = startTime.toLocaleDateString('en-US', {
    timeZone: 'Pacific/Guam',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = startTime.toLocaleTimeString('en-US', {
    timeZone: 'Pacific/Guam',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-100 flex flex-col items-center px-4 pt-12 pb-24">
      {/* Optional icon or decorative element at the top */}
      {/* <img 
        src="https://images.unsplash.com/photo-1539890472386-548ef20f5b88?auto=format&fit=crop&q=80&w=80" 
        alt="Sushi Icon" 
        className="mb-6 w-20 h-20 rounded-full shadow-lg"
      /> */}

      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 relative">
        <h1 className="text-3xl font-extrabold mb-4 text-gray-900">
          Reservation Confirmed!
        </h1>

        <div className="text-lg space-y-4 text-gray-700">
          <p>
            Thank you, <span className="font-semibold">{reservation.contact_name}</span>!
          </p>
          <p>
            Your reservation is booked for{' '}
            <strong>{dateStr}</strong> at <strong>{timeStr}</strong>.
          </p>
          <p>
            Party Size: <strong>{reservation.party_size}</strong>
          </p>
          <p>
            We look forward to serving you at{' '}
            <span className="font-semibold">Rotary Sushi</span>!
          </p>
        </div>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-orange-600 text-white text-base font-medium 
                       rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 
                       transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
