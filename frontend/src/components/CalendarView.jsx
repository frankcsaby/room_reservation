import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Users, MapPin, X, AlertCircle, Check
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

const localizer = momentLocalizer(moment);
const API_BASE_URL = 'http://localhost:8000/api';

const CalendarView = ({ user }) => {
  const [view, setView] = useState('month'); // 'month', 'week', 'day'
  const [date, setDate] = useState(new Date());
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const token = localStorage.getItem('access_token');

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data);
      if (data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0]);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Failed to load rooms');
    }
  }, [selectedRoom]);

  // Fetch availability for selected room
  const fetchAvailability = useCallback(async (silentErrors = false) => {
    if (!selectedRoom) return;

    setLoading(true);
    try {
      // Calculate date range based on current view
      let startDate, endDate;
      const currentDate = moment(date);

      if (view === 'month') {
        startDate = currentDate.clone().startOf('month').format('YYYY-MM-DD');
        endDate = currentDate.clone().endOf('month').format('YYYY-MM-DD');
      } else if (view === 'week') {
        startDate = currentDate.clone().startOf('week').format('YYYY-MM-DD');
        endDate = currentDate.clone().endOf('week').format('YYYY-MM-DD');
      } else {
        startDate = currentDate.format('YYYY-MM-DD');
        endDate = currentDate.format('YYYY-MM-DD');
      }

      const response = await fetch(
        `${API_BASE_URL}/rooms/${selectedRoom.id}/availability/?start_date=${startDate}&end_date=${endDate}`
      );

      if (!response.ok) throw new Error('Failed to fetch availability');
      const data = await response.json();

      // Transform reservations into calendar events
      const calendarEvents = [];
      Object.values(data.availability).forEach(dayData => {
        dayData.reservations.forEach(reservation => {
          const eventDate = moment(dayData.date).format('YYYY-MM-DD');
          const startDateTime = moment(`${eventDate} ${reservation.start_time}`).toDate();
          const endDateTime = moment(`${eventDate} ${reservation.end_time}`).toDate();

          calendarEvents.push({
            id: reservation.id,
            title: `Reserved (${reservation.attendees} people)`,
            start: startDateTime,
            end: endDateTime,
            status: reservation.status,
            attendees: reservation.attendees
          });
        });
      });

      setEvents(calendarEvents);
    } catch (err) {
      console.error('Error fetching availability:', err);
      // Only show error if not in silent mode (silent mode used when refreshing after success)
      if (!silentErrors) {
        setError('Failed to load room availability');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedRoom, date, view]);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      fetchAvailability();
    }
  }, [selectedRoom, date, view, fetchAvailability]);

  // Handle selecting a time slot
  const handleSelectSlot = useCallback(({ start, end }) => {
    if (!user) {
      setError('Please log in to make a reservation');
      return;
    }

    setSelectedSlot({ start, end });
    setShowReservationModal(true);
  }, [user]);

  // Handle selecting an existing event
  const handleSelectEvent = useCallback((event) => {
    // Could show event details or allow cancellation
    console.log('Selected event:', event);
  }, []);

  // Create reservation from calendar
  const handleCreateReservation = async (formData) => {
    if (!selectedSlot || !selectedRoom) return;

    setLoading(true);
    setError(null);

    try {
      const reservationDate = moment(selectedSlot.start).format('YYYY-MM-DD');
      const startTime = moment(selectedSlot.start).format('HH:mm');
      const endTime = moment(selectedSlot.end).format('HH:mm');

      const response = await fetch(`${API_BASE_URL}/reservations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          date: reservationDate,
          startTime: startTime,
          endTime: endTime,
          purpose: formData.purpose,
          attendees: parseInt(formData.attendees),
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create reservation');
      }

      setSuccess('Reservation created successfully!');
      setShowReservationModal(false);
      setSelectedSlot(null);
      // Refresh availability (silent errors to not override success message)
      fetchAvailability(true);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Custom event styling
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6'; // blue for confirmed
    if (event.status === 'pending') {
      backgroundColor = '#f59e0b'; // amber for pending
    } else if (event.status === 'cancelled') {
      backgroundColor = '#6b7280'; // gray for cancelled
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block'
      }
    };
  };

  // Custom toolbar
  const CustomToolbar = ({ label, onNavigate, onView, view: currentView }) => (
    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('PREV')}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
          {label}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('NEXT')}
          className="gap-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('TODAY')}
        >
          Today
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {['month', 'week', 'day'].map((v) => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentView === v
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Room Calendar
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage room reservations across time
          </p>
        </div>

        {/* Room Selector */}
        <div className="w-full md:w-auto">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Room
          </label>
          <select
            className="w-full md:w-64 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedRoom?.id || ''}
            onChange={(e) => {
              const room = rooms.find(r => r.id === parseInt(e.target.value));
              setSelectedRoom(room);
            }}
          >
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name} - {room.building}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-green-500">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Calendar */}
      <Card className="p-6">
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading calendar...</p>
          </div>
        )}

        <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            style={{ height: 600 }}
            components={{
              toolbar: CustomToolbar
            }}
            className="rrs-calendar"
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Cancelled</span>
          </div>
        </div>
      </Card>

      {/* Quick Reservation Modal */}
      {showReservationModal && (
        <ReservationModal
          slot={selectedSlot}
          room={selectedRoom}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedSlot(null);
          }}
          onSubmit={handleCreateReservation}
          loading={loading}
        />
      )}
    </div>
  );
};

// Reservation Modal Component
const ReservationModal = ({ slot, room, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    purpose: '',
    attendees: '1',
    contactEmail: '',
    contactPhone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const startTime = moment(slot.start);
  const endTime = moment(slot.end);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Create Reservation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {room.name} - {room.building}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Time Info */}
          <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-300">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{startTime.format('dddd, MMMM D, YYYY')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-300 mt-2">
              <Clock className="w-4 h-4" />
              <span>{startTime.format('HH:mm')} - {endTime.format('HH:mm')}</span>
              <span className="text-xs">({endTime.diff(startTime, 'hours')}h {endTime.diff(startTime, 'minutes') % 60}m)</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purpose *
              </label>
              <input
                type="text"
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Team meeting, Lecture, Workshop"
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Attendees *
              </label>
              <input
                type="number"
                required
                min="1"
                max={room.capacity}
                value={formData.attendees}
                onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Maximum capacity: {room.capacity}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Email *
              </label>
              <input
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="your.email@university.edu"
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Reservation'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default CalendarView;
