import React, { useState, useEffect, useMemo } from 'react';
import { Building, MapPin, Users, Clock, RefreshCw, Wifi, WifiOff, Filter } from 'lucide-react';
import useWebSocket from '../hooks/useWebSocket';
import RoomStatusBadge from './RoomStatusBadge';

const API_BASE_URL = 'http://localhost:8000/api';
const WS_BASE_URL = 'ws://localhost:8000';

/**
 * RoomMonitor - Live monitoring dashboard for all rooms
 * Displays a real-time grid of room statuses with WebSocket updates
 */
const RoomMonitor = () => {
  const [rooms, setRooms] = useState([]);
  const [roomStatuses, setRoomStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'free', 'occupied', 'ending_soon'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'building', 'status'

  // Fetch initial room data
  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching rooms:', err);
    }
  };

  // Fetch initial room statuses
  const fetchRoomStatuses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/status/`);
      if (!response.ok) throw new Error('Failed to fetch room statuses');
      const data = await response.json();

      // Convert array to object keyed by room_id
      const statusMap = {};
      data.forEach(status => {
        statusMap[status.room_id] = status;
      });
      setRoomStatuses(statusMap);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching room statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomStatuses();
  }, []);

  // WebSocket connection for live updates
  const { isConnected, connectionStatus, lastMessage } = useWebSocket(
    `${WS_BASE_URL}/ws/rooms/overview/`,
    {
      enabled: true,
      onMessage: (data) => {
        console.log('[RoomMonitor] WebSocket message:', data);

        // Handle heartbeat updates with all room statuses
        if (data.type === 'heartbeat' && data.rooms) {
          const statusMap = {};
          data.rooms.forEach(status => {
            statusMap[status.room_id] = status;
          });
          setRoomStatuses(statusMap);
        }

        // Handle initial rooms status
        if (data.type === 'rooms.status' && data.rooms) {
          const statusMap = {};
          data.rooms.forEach(status => {
            statusMap[status.room_id] = status;
          });
          setRoomStatuses(statusMap);
        }

        // Handle individual room updates
        if (data.type === 'room.update' && data.room_id) {
          // Refresh specific room status
          setRoomStatuses(prev => ({
            ...prev,
            [data.room_id]: {
              ...prev[data.room_id],
              // Trigger a status refresh on next heartbeat
              needsRefresh: true
            }
          }));
        }
      }
    }
  );

  // Filter and sort rooms
  const filteredAndSortedRooms = useMemo(() => {
    let filtered = rooms.filter(room => {
      const status = roomStatuses[room.id];
      if (!status) return true;

      if (filter === 'free') return status.occupancy_status === 'free';
      if (filter === 'occupied') return status.occupancy_status === 'occupied';
      if (filter === 'ending_soon') return status.occupancy_status === 'ending_soon';
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'building') {
        return a.building.localeCompare(b.building) || a.name.localeCompare(b.name);
      }
      if (sortBy === 'status') {
        const statusA = roomStatuses[a.id]?.occupancy_status || 'free';
        const statusB = roomStatuses[b.id]?.occupancy_status || 'free';
        const statusOrder = { occupied: 0, ending_soon: 1, free: 2 };
        return (statusOrder[statusA] || 3) - (statusOrder[statusB] || 3);
      }
      return 0;
    });

    return filtered;
  }, [rooms, roomStatuses, filter, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = rooms.length;
    let free = 0, occupied = 0, endingSoon = 0;

    rooms.forEach(room => {
      const status = roomStatuses[room.id];
      if (!status) return;

      if (status.occupancy_status === 'free') free++;
      else if (status.occupancy_status === 'occupied') occupied++;
      else if (status.occupancy_status === 'ending_soon') endingSoon++;
    });

    return { total, free, occupied, endingSoon };
  }, [rooms, roomStatuses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading room monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Room Monitor</h1>
                <p className="text-sm text-gray-500">Live room occupancy status</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600 font-medium">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Rooms</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <div className="text-sm text-green-700">Available</div>
            <div className="text-2xl font-bold text-green-700">{stats.free}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
            <div className="text-sm text-yellow-700">Ending Soon</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.endingSoon}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <div className="text-sm text-red-700">Occupied</div>
            <div className="text-2xl font-bold text-red-700">{stats.occupied}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <Filter className="h-5 w-5 text-gray-500" />
              <label className="text-sm text-gray-700">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Rooms</option>
                <option value="free">Available Only</option>
                <option value="occupied">Occupied Only</option>
                <option value="ending_soon">Ending Soon</option>
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="name">Name</option>
                <option value="building">Building</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedRooms.map(room => {
            const status = roomStatuses[room.id];
            return (
              <div
                key={room.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
              >
                {/* Room Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{room.name}</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span>{room.building}, Floor {room.floor}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                {status && (
                  <div className="mb-3">
                    <RoomStatusBadge status={status} showDetails={true} animate={true} />
                  </div>
                )}

                {/* Room Details */}
                <div className="flex items-center text-sm text-gray-600 pt-3 border-t">
                  <Users className="h-4 w-4 mr-1" />
                  <span>Capacity: {room.capacity}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAndSortedRooms.length === 0 && (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No rooms match the current filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomMonitor;
