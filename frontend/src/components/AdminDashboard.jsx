import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, TrendingUp, Clock, Building, Activity, BarChart3, Shield,
  Eye, Edit, Trash2, Plus, Download, AlertTriangle, CheckCircle, XCircle,
  Settings, Database, RefreshCw, TrendingDown
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

const API_BASE_URL = 'http://localhost:8000/api';

const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, rooms, activity, users
  const [isAdmin, setIsAdmin] = useState(false);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
      // Refresh data every 2 minutes
      const interval = setInterval(fetchAllData, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/check/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Not authorized');
      const data = await response.json();
      setIsAdmin(data.is_admin);
      if (!data.is_admin) {
        setError('You do not have admin privileges to access this dashboard');
      }
    } catch (err) {
      setError('Failed to verify admin status');
      console.error('Error checking admin status:', err);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDashboardStats(),
        fetchActivityFeed(),
        fetchAllRooms(),
        fetchAllReservations()
      ]);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    const response = await fetch(`${API_BASE_URL}/stats/dashboard/`);
    if (!response.ok) throw new Error('Failed to fetch dashboard statistics');
    const data = await response.json();
    setStats(data);
  };

  const fetchActivityFeed = async () => {
    const response = await fetch(`${API_BASE_URL}/activity/feed/?limit=50`);
    if (!response.ok) throw new Error('Failed to fetch activity feed');
    const data = await response.json();
    setActivityFeed(data.activities || []);
  };

  const fetchAllRooms = async () => {
    const response = await fetch(`${API_BASE_URL}/rooms/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch rooms');
    const data = await response.json();
    setRooms(data);
  };

  const fetchAllReservations = async () => {
    const response = await fetch(`${API_BASE_URL}/reservations/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch reservations');
    const data = await response.json();
    setAllReservations(data);
  };

  const exportReport = (type) => {
    // Generate CSV data based on type
    let csvContent = '';
    let filename = '';

    if (type === 'rooms') {
      filename = `rooms_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'ID,Name,Building,Floor,Capacity,Active\n';
      rooms.forEach(room => {
        csvContent += `${room.id},"${room.name}","${room.building}",${room.floor},${room.capacity},${room.is_active}\n`;
      });
    } else if (type === 'reservations') {
      filename = `reservations_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'ID,Room,Date,Start Time,End Time,User,Status,Attendees,Purpose\n';
      allReservations.forEach(res => {
        csvContent += `${res.id},"${res.room.name}",${res.date},${res.start_time},${res.end_time},"${res.user.username}",${res.status},${res.attendees},"${res.purpose}"\n`;
      });
    } else if (type === 'activity') {
      filename = `activity_report_${new Date().toISOString().split('T')[0]}.csv`;
      csvContent = 'ID,User,Action,Room,Description,Timestamp\n';
      activityFeed.forEach(activity => {
        csvContent += `${activity.id},"${activity.user.username}","${activity.action}","${activity.room?.name || 'N/A'}","${activity.description}",${activity.created_at}\n`;
      });
    }

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isAdmin && !loading) {
    return (
      <Card className="p-12 text-center">
        <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400">{error || 'You do not have permission to access this page'}</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
      </div>
    );
  }

  // Calculate additional metrics
  const pendingReservations = allReservations.filter(r => r.status === 'pending').length;
  const confirmedReservations = allReservations.filter(r => r.status === 'confirmed').length;
  const cancelledReservations = allReservations.filter(r => r.status === 'cancelled').length;
  const activeRooms = rooms.filter(r => r.is_active).length;
  const inactiveRooms = rooms.filter(r => !r.is_active).length;

  // Recent activity (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentActivity = activityFeed.filter(a => new Date(a.created_at) > oneDayAgo);

  // Reservation trends (by status)
  const reservationTrends = {
    pending: pendingReservations,
    confirmed: confirmedReservations,
    cancelled: cancelledReservations
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            System administration and analytics
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAllData}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin Tabs */}
      <Card className="p-2">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'overview'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'rooms'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Room Management
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'activity'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Activity Monitor
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'reservations'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Reservations
          </button>
        </nav>
      </Card>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* System Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Rooms */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Rooms</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats?.total_rooms || 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-green-600 dark:text-green-400">{activeRooms} active</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-red-600 dark:text-red-400">{inactiveRooms} inactive</span>
                  </div>
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">All Reservations</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {allReservations.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {confirmedReservations} confirmed
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                  <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            {/* Pending Actions */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {pendingReservations}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                    Requires attention
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                  <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </Card>

            {/* System Activity */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">24h Activity</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {recentActivity.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Recent actions
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                  <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Reservation Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Reservation Status Distribution
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmed</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{confirmedReservations}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${(confirmedReservations / Math.max(allReservations.length, 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{pendingReservations}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${(pendingReservations / Math.max(allReservations.length, 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cancelled</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{cancelledReservations}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(cancelledReservations / Math.max(allReservations.length, 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Card>

            {/* System Health */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                System Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API Status</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">Operational</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Database</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">Connected</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Occupancy Rate</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{stats?.occupancy_rate || 0}%</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Performing Rooms */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Performing Rooms</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportReport('rooms')}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
            {stats?.popular_rooms && stats.popular_rooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.popular_rooms.slice(0, 6).map((room, index) => (
                  <div
                    key={room.id}
                    className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-800"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{room.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{room.building}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Capacity: {room.capacity}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{room.reservation_count} bookings</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-600 dark:text-gray-400">No room data available</p>
            )}
          </Card>
        </>
      )}

      {/* Rooms Management Tab */}
      {activeTab === 'rooms' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Room Management</h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportReport('rooms')}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Building</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Floor</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Capacity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{room.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{room.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{room.building}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{room.floor}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{room.capacity}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        room.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {room.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Activity Monitor Tab */}
      {activeTab === 'activity' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Activity Monitor</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Showing last {activityFeed.length} activities
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportReport('activity')}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {activityFeed.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{activity.user.username}</span>
                    {activity.room && (
                      <>
                        <span>•</span>
                        <span>{activity.room.name}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{activity.time_ago}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  activity.action.includes('created') || activity.action.includes('confirmed')
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : activity.action.includes('deleted') || activity.action.includes('cancelled')
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                }`}>
                  {activity.action.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Reservations Tab */}
      {activeTab === 'reservations' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Reservations</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportReport('reservations')}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Room</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Attendees</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {allReservations.slice(0, 50).map(res => (
                  <tr key={res.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{res.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{res.room.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{res.user.username}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{res.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{res.start_time} - {res.end_time}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{res.attendees}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        res.status === 'confirmed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : res.status === 'pending'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allReservations.length > 50 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              Showing first 50 of {allReservations.length} reservations
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
