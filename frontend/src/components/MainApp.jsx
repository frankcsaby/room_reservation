import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Users, MapPin, Filter, X, ChevronLeft, Check, AlertCircle, Building, Trash2, LogOut
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import ThemeToggle from './ui/ThemeToggle';

const API_BASE_URL = 'http://localhost:8000/api';

const MainApp = ({ user, setUser }) => {
  const [currentView, setCurrentView] = useState('browse');
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filters, setFilters] = useState({
    capacity: '',
    building: '',
    date: '',
    startTime: '',
    endTime: ''
  });
  const [reservationForm, setReservationForm] = useState({
    roomId: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: '',
    contactEmail: '',
    contactPhone: ''
  });

  const token = localStorage.getItem('access_token');

  // Fetch rooms
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's reservations
  const fetchReservations = async () => {
    if (!user || !user.id) {
      console.error('Cannot fetch reservations: user or user.id is undefined');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reservations/user/${user.id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to fetch reservations');
      }
      const data = await response.json();
      setReservations(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    if (user && user.id) {
      fetchReservations();
    }
  }, [user]);

  // Reservation submit
  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reservations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId: reservationForm.roomId,
          date: reservationForm.date,
          startTime: reservationForm.startTime,
          endTime: reservationForm.endTime,
          purpose: reservationForm.purpose,
          attendees: parseInt(reservationForm.attendees),
          contactEmail: reservationForm.contactEmail,
          contactPhone: reservationForm.contactPhone
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to create reservation');
      }

      setSuccess('Reservation created successfully!');
      setReservationForm({
        roomId: '',
        date: '',
        startTime: '',
        endTime: '',
        purpose: '',
        attendees: '',
        contactEmail: '',
        contactPhone: ''
      });
      setSelectedRoom(null);
      fetchReservations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error creating reservation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cancel reservation
  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to cancel reservation');
      }

      setSuccess('Reservation cancelled successfully!');
      fetchReservations();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error cancelling reservation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    if (filters.capacity && room.capacity < parseInt(filters.capacity)) return false;
    if (filters.building && room.building !== filters.building) return false;
    return true;
  });
  const buildings = [...new Set(rooms.map(room => room.building))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Room Reservation
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">University System</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setCurrentView('browse')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === 'browse'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Browse Rooms
                </button>
                <button
                  onClick={() => setCurrentView('reservations')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentView === 'reservations'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  My Reservations
                </button>
              </nav>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="hidden md:flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <Button onClick={handleLogout} variant="ghost" size="sm" className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Alerts */}
      <div className="container mx-auto px-6 pt-6">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400 flex-1">{success}</p>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 dark:hover:text-green-300 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 pb-12">
        {/* Browse Rooms */}
        {currentView === 'browse' && !selectedRoom && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Rooms</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Building
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={filters.building}
                    onChange={e => setFilters({...filters, building: e.target.value})}
                  >
                    <option value="">All Buildings</option>
                    {buildings.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Capacity
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={filters.capacity}
                    onChange={e => setFilters({...filters, capacity: e.target.value})}
                    placeholder="Enter minimum capacity"
                  />
                </div>
              </div>
            </Card>

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rooms...</p>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No rooms found</p>
                </div>
              ) : (
                filteredRooms.map(room => (
                  <Card key={room.id} hover className="p-6 group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {room.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {room.building}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span>Floor {room.floor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>Capacity: {room.capacity}</span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedRoom(room);
                        setReservationForm({...reservationForm, roomId: room.id});
                      }}
                    >
                      Reserve Room
                    </Button>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Reservation Form */}
        {selectedRoom && (
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => setSelectedRoom(null)}
              className="mb-6 gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Rooms
            </Button>

            <Card className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Reserve {selectedRoom.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedRoom.building} - Floor {selectedRoom.floor}
                </p>
              </div>

              <form onSubmit={handleReservationSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Date"
                    required
                    value={reservationForm.date}
                    onChange={e => setReservationForm({...reservationForm, date: e.target.value})}
                  />
                  <Input
                    type="number"
                    label="Number of Attendees"
                    required
                    min="1"
                    max={selectedRoom.capacity}
                    value={reservationForm.attendees}
                    onChange={e => setReservationForm({...reservationForm, attendees: e.target.value})}
                    placeholder={`Max ${selectedRoom.capacity}`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="time"
                    label="Start Time"
                    required
                    value={reservationForm.startTime}
                    onChange={e => setReservationForm({...reservationForm, startTime: e.target.value})}
                  />
                  <Input
                    type="time"
                    label="End Time"
                    required
                    value={reservationForm.endTime}
                    onChange={e => setReservationForm({...reservationForm, endTime: e.target.value})}
                  />
                </div>

                <Input
                  type="text"
                  label="Purpose"
                  required
                  value={reservationForm.purpose}
                  onChange={e => setReservationForm({...reservationForm, purpose: e.target.value})}
                  placeholder="e.g., Team meeting, Lecture, Workshop"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="email"
                    label="Contact Email"
                    required
                    value={reservationForm.contactEmail}
                    onChange={e => setReservationForm({...reservationForm, contactEmail: e.target.value})}
                    placeholder="your.email@university.edu"
                  />
                  <Input
                    type="tel"
                    label="Contact Phone (Optional)"
                    value={reservationForm.contactPhone}
                    onChange={e => setReservationForm({...reservationForm, contactPhone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Creating Reservation...' : 'Confirm Reservation'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => setSelectedRoom(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* My Reservations */}
        {currentView === 'reservations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Reservations</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {reservations.length} {reservations.length === 1 ? 'reservation' : 'reservations'}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reservations...</p>
              </div>
            ) : reservations.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No reservations yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You haven't made any room reservations yet.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setCurrentView('browse')}
                >
                  Browse Rooms
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {reservations.map(r => (
                  <Card key={r.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {r.room.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {r.room.building} - Floor {r.room.floor}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            r.status === 'confirmed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : r.status === 'pending'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                          }`}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(r.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{r.start_time} - {r.end_time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Users className="w-4 h-4" />
                            <span>{r.attendees} attendees</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Purpose
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {r.purpose}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleCancelReservation(r.id)}
                        className="gap-2 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default MainApp;
