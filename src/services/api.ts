// src/services/api.ts
import axios from 'axios';

// For Vite:
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({ baseURL });

// === Add this interceptor so EVERY request sends our JWT if available ===
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ------------- Restaurant -------------
export async function fetchRestaurant(id: number) {
  // Make sure the backend returns :time_zone if it’s present in the restaurant model
  const resp = await apiClient.get(`/restaurants/${id}`);
  // e.g. resp.data => { id, name, time_zone, ... }
  return resp.data;
}

// ------------- Layouts -------------
export async function fetchAllLayouts() {
  const resp = await apiClient.get('/layouts');
  return resp.data;
}

export async function fetchLayout(layoutId: number) {
  const resp = await apiClient.get(`/layouts/${layoutId}`);
  return resp.data;
}

export async function createLayout(layoutData: any) {
  const resp = await apiClient.post('/layouts', { layout: layoutData });
  return resp.data;
}

export async function updateLayout(layoutId: number, layoutData: any) {
  const resp = await apiClient.patch(`/layouts/${layoutId}`, { layout: layoutData });
  return resp.data;
}

export async function activateLayout(layoutId: number) {
  const resp = await apiClient.post(`/layouts/${layoutId}/activate`);
  return resp.data;
}

// ------------- Reservations -------------
export async function fetchReservations(params?: { date?: string }) {
  const resp = await apiClient.get('/reservations', { params });
  return resp.data;
}

export async function createReservation(data: {
  restaurant_id?: number;
  start_time: string;
  party_size: number;
  contact_name: string;
  contact_phone?: string;
  contact_email?: string;
  status?: string;
}) {
  const resp = await apiClient.post('/reservations', data);
  return resp.data;
}

export async function updateReservation(
  id: number,
  data: Partial<{
    party_size: number;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    status: string;
  }>
) {
  const resp = await apiClient.patch(`/reservations/${id}`, data);
  return resp.data;
}

export async function deleteReservation(id: number) {
  await apiClient.delete(`/reservations/${id}`);
}

// ------------- Waitlist -------------
export async function fetchWaitlistEntries(params?: { date?: string }) {
  const resp = await apiClient.get('/waitlist_entries', { params });
  return resp.data;
}

export async function createWaitlistEntry(data: {
  contact_name: string;
  party_size: number;
  contact_phone?: string;
  check_in_time?: string;
  status?: string;
  restaurant_id?: number;
}) {
  const resp = await apiClient.post('/waitlist_entries', data);
  return resp.data;
}

// ------------- Seat Allocations -------------
export async function fetchSeatAllocations(params?: { date?: string }) {
  const resp = await apiClient.get('/seat_allocations', { params });
  return resp.data;
}

export async function seatAllocationMultiCreate(allocationData: any) {
  const resp = await apiClient.post('/seat_allocations/multi_create', {
    seat_allocation: allocationData,
  });
  return resp.data;
}

export async function seatAllocationReserve(allocationData: any) {
  const resp = await apiClient.post('/seat_allocations/reserve', {
    seat_allocation: allocationData,
  });
  return resp.data;
}

export async function seatAllocationFinish(payload: { occupant_type: string; occupant_id: number }) {
  const resp = await apiClient.post('/seat_allocations/finish', payload);
  return resp.data;
}

export async function seatAllocationNoShow(payload: { occupant_type: string; occupant_id: number }) {
  const resp = await apiClient.post('/seat_allocations/no_show', payload);
  return resp.data;
}

export async function seatAllocationCancel(payload: { occupant_type: string; occupant_id: number }) {
  const resp = await apiClient.post('/seat_allocations/cancel', payload);
  return resp.data;
}

export async function seatAllocationArrive(payload: { occupant_type: string; occupant_id: number }) {
  const resp = await apiClient.post('/seat_allocations/arrive', payload);
  return resp.data;
}

// ------------- Availability -------------
export async function fetchAvailability(date: string, partySize: number) {
  const resp = await apiClient.get('/availability', {
    params: { date, party_size: partySize },
  });
  // e.g. return { slots: [...] }
  return resp.data;
}

// ------------- Auth Calls -------------
export async function signupUser(data: {
  first_name: string;
  last_name: string;
  phone?: string;
  email: string;
  password: string;
  password_confirmation: string;
  restaurant_id?: number;
}) {
  const resp = await apiClient.post('/signup', data);
  // e.g. { jwt, user }
  return resp.data;
}

export async function loginUser(email: string, password: string) {
  const resp = await apiClient.post('/login', { email, password });
  // e.g. { jwt, user }
  return resp.data;
}
