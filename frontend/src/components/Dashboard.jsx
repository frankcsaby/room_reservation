import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, TrendingUp, Clock, Building, Activity, BarChart3, PieChart
} from 'lucide-react';
import Card from './ui/Card';

const API_BASE_URL = 'http://localhost:8000/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchDashboardStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/dashboard/`);
      if (!response.ok) throw new Error('Failed to fetch dashboard statistics');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Activity className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of room reservations and system statistics
          </p>
        </div>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Rooms */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Rooms</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.total_rooms || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Active rooms available</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Total Reservations */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Reservations</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.total_reservations || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Confirmed bookings</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Today's Reservations */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Reservations</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.today_reservations || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Active today</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Occupancy Rate */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Occupancy Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.occupancy_rate || 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {stats?.occupied_rooms || 0} rooms occupied now
              </p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Average Attendees */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Attendees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats?.avg_attendees || 0} people
              </p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${Math.min((stats?.avg_attendees || 0) / 20 * 100, 100)}%` }}
            ></div>
          </div>
        </Card>

        {/* Next Week Reservations */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Next 7 Days</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats?.upcoming_week_count || 0} reservations
              </p>
            </div>
            <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20">
              <Calendar className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Upcoming bookings for the next week
          </p>
        </Card>
      </div>

      {/* Popular Rooms */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Popular Rooms</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Most frequently reserved rooms
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {stats?.popular_rooms && stats.popular_rooms.length > 0 ? (
          <div className="space-y-4">
            {stats.popular_rooms.map((room, index) => {
              const maxCount = stats.popular_rooms[0]?.reservation_count || 1;
              const percentage = (room.reservation_count / maxCount) * 100;

              return (
                <div key={room.id} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{room.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {room.building} • Capacity: {room.capacity}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {room.reservation_count}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">bookings</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 group-hover:from-blue-600 group-hover:to-purple-600"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No room data available</p>
          </div>
        )}
      </Card>

      {/* Last Updated */}
      {stats?.timestamp && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-500">
          Last updated: {new Date(stats.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
