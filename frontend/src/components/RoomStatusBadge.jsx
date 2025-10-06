import React from 'react';
import { Circle, Clock, Users } from 'lucide-react';

/**
 * RoomStatusBadge - Displays live occupancy status for a room
 *
 * @param {object} status - Room status object from API/WebSocket
 * @param {string} status.occupancy_status - 'free', 'occupied', or 'ending_soon'
 * @param {boolean} status.is_occupied - Whether room is currently occupied
 * @param {number} status.time_until_free - Minutes until room is free
 * @param {number} status.reservations_today - Number of reservations today
 * @param {string} status.next_available - Next available time slot (HH:MM)
 * @param {number} status.current_attendees - Current number of attendees
 * @param {boolean} showDetails - Whether to show detailed info
 * @param {boolean} animate - Whether to show pulse animation
 */
const RoomStatusBadge = ({ status, showDetails = false, animate = true }) => {
  if (!status) return null;

  const { occupancy_status, is_occupied, time_until_free, reservations_today, next_available, current_attendees } = status;

  // Determine badge styling based on occupancy status
  const getStatusStyles = () => {
    switch (occupancy_status) {
      case 'free':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-300',
          icon: 'text-green-600',
          label: 'Available'
        };
      case 'occupied':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-300',
          icon: 'text-red-600',
          label: 'Occupied'
        };
      case 'ending_soon':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-300',
          icon: 'text-yellow-600',
          label: 'Ending Soon'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-300',
          icon: 'text-gray-600',
          label: 'Unknown'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className="space-y-2">
      {/* Main Status Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full border ${styles.bg} ${styles.border} ${styles.text}`}>
        <Circle
          className={`h-3 w-3 mr-2 ${styles.icon} ${animate && is_occupied ? 'animate-pulse' : ''}`}
          fill="currentColor"
        />
        <span className="text-sm font-medium">{styles.label}</span>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="text-xs space-y-1 text-gray-600">
          {is_occupied && time_until_free !== null && (
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>Free in {time_until_free} min</span>
            </div>
          )}

          {is_occupied && current_attendees > 0 && (
            <div className="flex items-center">
              <Users className="h-3 w-3 mr-1" />
              <span>{current_attendees} attendees</span>
            </div>
          )}

          {!is_occupied && next_available && (
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              <span>Next: {next_available}</span>
            </div>
          )}

          {reservations_today > 0 && (
            <div className="text-gray-500">
              {reservations_today} booking{reservations_today > 1 ? 's' : ''} today
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomStatusBadge;
