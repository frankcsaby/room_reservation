import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Clock, User, MapPin, Star, Calendar, CheckCircle, XCircle, Trash2
} from 'lucide-react';
import Card from './ui/Card';

const API_BASE_URL = 'http://localhost:8000/api';

const ActivityFeed = ({ user }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(20);

  const token = localStorage.getItem('access_token');

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/activity/feed/?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();

    // Refresh activities every 30 seconds for real-time feel
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'reservation_created':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'reservation_confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'reservation_cancelled':
        return <XCircle className="w-4 h-4 text-orange-500" />;
      case 'reservation_deleted':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'room_favorited':
        return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
      case 'room_unfavorited':
        return <Star className="w-4 h-4 text-gray-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'reservation_created':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'reservation_confirmed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'reservation_cancelled':
      case 'reservation_deleted':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'room_favorited':
      case 'room_unfavorited':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Feed</h2>
        </div>
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading activities...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Feed</h2>
        </div>
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Feed</h2>
        </div>
        <button
          onClick={fetchActivities}
          disabled={loading}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No activities yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${getActionColor(
                activity.action
              )}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getActionIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {activity.user?.username || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {activity.description}
                      </p>
                      {activity.room_name && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <MapPin className="w-3 h-3" />
                          <span>{activity.room_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{activity.time_ago}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activities.length > 0 && activities.length >= limit && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setLimit((prev) => prev + 20)}
            disabled={loading}
            className="w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }
      `}</style>
    </Card>
  );
};

export default ActivityFeed;
