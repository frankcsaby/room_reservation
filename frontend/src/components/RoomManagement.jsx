import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Building, MapPin, Users, Check, X, AlertCircle, Upload, Eye, EyeOff
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import ConfirmDialog from './ui/ConfirmDialog';

const API_BASE_URL = 'http://localhost:8000/api';

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [showInactive, setShowInactive] = useState(true);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, room: null });
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: 1,
    capacity: 1,
    amenities: [],
    room_image_url: '',
    is_active: true
  });
  const [amenityInput, setAmenityInput] = useState('');

  const token = localStorage.getItem('access_token');

  // Fetch rooms
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/rooms/?include_inactive=${showInactive}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

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

  useEffect(() => {
    fetchRooms();
  }, [showInactive]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingRoom
        ? `${API_BASE_URL}/admin/rooms/${editingRoom.id}/`
        : `${API_BASE_URL}/admin/rooms/`;

      const method = editingRoom ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to save room');
      }

      setSuccess(editingRoom ? 'Room updated successfully!' : 'Room created successfully!');
      setShowForm(false);
      setEditingRoom(null);
      resetForm();
      fetchRooms();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error saving room:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (room) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/rooms/${room.id}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to delete room');
      }

      setSuccess('Room deactivated successfully!');
      fetchRooms();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error deleting room:', err);
    } finally {
      setLoading(false);
      setConfirmDialog({ isOpen: false, room: null });
    }
  };

  // Handle bulk toggle
  const handleBulkToggle = async (active) => {
    if (selectedRooms.length === 0) {
      setError('No rooms selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/rooms/bulk-toggle/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          room_ids: selectedRooms,
          active
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to update rooms');
      }

      const data = await response.json();
      setSuccess(data.message);
      setSelectedRooms([]);
      fetchRooms();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error bulk updating rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  // Edit room
  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      building: room.building,
      floor: room.floor,
      capacity: room.capacity,
      amenities: room.amenities || [],
      room_image_url: room.room_image_url || '',
      is_active: room.is_active
    });
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      building: '',
      floor: 1,
      capacity: 1,
      amenities: [],
      room_image_url: '',
      is_active: true
    });
    setAmenityInput('');
    setEditingRoom(null);
    setShowForm(false);
  };

  // Add amenity
  const addAmenity = () => {
    if (amenityInput.trim() && !formData.amenities.includes(amenityInput.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenityInput.trim()]
      });
      setAmenityInput('');
    }
  };

  // Remove amenity
  const removeAmenity = (amenity) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter(a => a !== amenity)
    });
  };

  // Toggle room selection
  const toggleRoomSelection = (roomId) => {
    setSelectedRooms(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  // Select all rooms
  const toggleSelectAll = () => {
    if (selectedRooms.length === rooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map(r => r.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Room Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage room inventory and configurations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowInactive(!showInactive)}
            className="gap-2"
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowForm(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedRooms.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedRooms.length} room{selectedRooms.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkToggle(true)}
              >
                Activate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkToggle(false)}
              >
                Deactivate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRooms([])}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetForm} />
          <Card className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Room Name"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Conference Room A"
                />
                <Input
                  label="Building"
                  required
                  value={formData.building}
                  onChange={e => setFormData({ ...formData, building: e.target.value })}
                  placeholder="e.g., Main Building"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Floor"
                  required
                  min="1"
                  value={formData.floor}
                  onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Capacity"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                />
              </div>

              <Input
                label="Room Image URL"
                value={formData.room_image_url}
                onChange={e => setFormData({ ...formData, room_image_url: e.target.value })}
                placeholder="https://example.com/room-image.jpg"
              />

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amenities
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={amenityInput}
                    onChange={e => setAmenityInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                    placeholder="Add amenity (e.g., Projector, Whiteboard)"
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="button" onClick={addAmenity} variant="secondary">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => removeAmenity(amenity)}
                        className="hover:text-blue-900 dark:hover:text-blue-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Room is active
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                  {loading ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Rooms List */}
      <div className="space-y-4">
        {loading && !showForm ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <Card className="p-12 text-center">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No rooms found</p>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <Card className="p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRooms.length === rooms.length && rooms.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select All ({rooms.length} rooms)
                </span>
              </label>
            </Card>

            {/* Room Cards */}
            {rooms.map(room => (
              <Card key={room.id} className={`p-6 ${!room.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedRooms.includes(room.id)}
                    onChange={() => toggleRoomSelection(room.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {room.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {room.building}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Floor {room.floor}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Capacity: {room.capacity}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          room.is_active
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                          {room.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Amenities */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-2">
                          {room.amenities.map((amenity, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                      <span>{room.reservation_count} reservations</span>
                      <span>{room.favorite_count} favorites</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(room)}
                      className="gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDialog({ isOpen: true, room })}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, room: null })}
        onConfirm={() => handleDelete(confirmDialog.room)}
        title="Deactivate Room"
        message={`Are you sure you want to deactivate "${confirmDialog.room?.name}"? This will make it unavailable for new reservations.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default RoomManagement;
