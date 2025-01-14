import React from 'react';
import type { StaffMember } from '../types';

const staffMembers: StaffMember[] = [
  {
    name: 'Chef Akira',
    role: 'Head Chef',
    image: 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    name: 'Chef Yuki',
    role: 'Sushi Chef',
    image: 'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    name: 'Chef Kenji',
    role: 'Sushi Chef',
    image: 'https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?auto=format&fit=crop&q=80&w=200&h=200'
  }
];

export default function StaffBanner() {
  return (
    <div className="bg-orange-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Meet Our Team
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {staffMembers.map((staff) => (
            <div key={staff.name} className="text-center">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <img
                  src={staff.image}
                  alt={staff.name}
                  className="rounded-full object-cover w-full h-full shadow-lg"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{staff.name}</h3>
              <p className="text-gray-600">{staff.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}