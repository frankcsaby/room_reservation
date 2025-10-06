import React, { useState, useEffect } from 'react';
import moment from 'moment';
import {
  X, Calendar, Clock, Users, Repeat, AlertCircle, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

const API_BASE_URL = 'http://localhost:8000/api';

const RecurringReservationModal = ({ room, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    frequency: 'weekly',
    startDate: moment().add(1, 'day').format('YYYY-MM-DD'),
    endDate: moment().add(1, 'month').format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '10:00',
    purpose: '',
    attendees: '1',
    contactEmail: '',
    contactPhone: ''
  });

  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const token = localStorage.getItem('access_token');

  // Fetch preview when form data changes
  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      fetchPreview();
    }
  }, [formData.frequency, formData.startDate, formData.endDate, formData.startTime, formData.endTime]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const params = new URLSearchParams({
        frequency: formData.frequency,
        start_date: formData.startDate,
        end_date: formData.endDate,
        start_time: formData.startTime,
        end_time: formData.endTime,
        room_id: room.id
      });

      const response = await fetch(`${API_BASE_URL}/reservations/recurring/preview/?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preview');
      }

      const data = await response.json();
      setPreview(data);
    } catch (err) {
      console.error('Error fetching preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/reservations/recurring/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          room_id: room.id,
          frequency: formData.frequency,
          start_date: formData.startDate,
          end_date: formData.endDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          purpose: formData.purpose,
          attendees: parseInt(formData.attendees),
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create recurring reservation');
      }

      const result = await response.json();
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const frequencyOptions = [
    { value: 'daily', label: 'Daily', description: 'Every day' },
    { value: 'weekly', label: 'Weekly', description: 'Once a week' },
    { value: 'biweekly', label: 'Bi-weekly', description: 'Every two weeks' },
    { value: 'monthly', label: 'Monthly', description: 'Once a month' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Create Recurring Reservation
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

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500">
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Frequency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Frequency *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {frequencyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, frequency: option.value })}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      formData.frequency === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Repeat className={`w-4 h-4 ${
                        formData.frequency === option.value
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        formData.frequency === option.value
                          ? 'text-blue-900 dark:text-blue-300'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  min={moment().add(1, 'day').format('YYYY-MM-DD')}
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  min={formData.startDate}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Preview Section */}
            {preview && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Preview: {preview.total_dates} reservations
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {preview.available} available, {preview.conflicts} conflicts
                      </p>
                    </div>
                  </div>
                  {showPreview ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {showPreview && (
                  <div className="p-4 max-h-48 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                      {preview.dates.map((date, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            date.has_conflict
                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          }`}
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {moment(date.date).format('MMM D, YYYY')} ({date.day_of_week})
                          </span>
                          {date.has_conflict ? (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                              Conflict
                            </span>
                          ) : (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purpose *
              </label>
              <input
                type="text"
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Weekly team meeting"
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Attendees */}
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

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Warning if conflicts exist */}
            {preview && preview.conflicts > 0 && (
              <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                    {preview.conflicts} date{preview.conflicts !== 1 ? 's have' : ' has'} conflicts
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    These dates will be skipped. Only {preview.available} reservation{preview.available !== 1 ? 's' : ''} will be created.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading || loadingPreview || (preview && preview.available === 0)}
              >
                {loading ? 'Creating...' : `Create ${preview ? preview.available : '...'} Reservations`}
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

export default RecurringReservationModal;
