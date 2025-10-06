import React, { useState, useEffect } from 'react';
import {
  User, Mail, Settings, Bell, Moon, Sun, MonitorSmartphone, Save, CheckCircle, AlertCircle
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE_URL = 'http://localhost:8000/api';

const ProfileSettings = ({ user }) => {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    theme: 'auto',
    notifications_enabled: true,
    email_reminders: true
  });

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/profile/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setSettings({
        theme: data.theme || 'auto',
        notifications_enabled: data.notifications_enabled !== undefined ? data.notifications_enabled : true,
        email_reminders: data.email_reminders !== undefined ? data.email_reminders : true
      });
    } catch (err) {
      setError(err.message);
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/profile/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setProfile(data);
      setSuccess('Settings saved successfully!');

      // Apply theme change
      if (settings.theme !== theme) {
        setTheme(settings.theme);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setSettings({ ...settings, theme: newTheme });
  };

  if (loading && !profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-6">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account preferences and notification settings
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* User Information */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Information</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{user.username}</p>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{user.email}</span>
              </div>
            </div>
          </div>

          {profile && profile.favorite_rooms && profile.favorite_rooms.length > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{profile.favorite_rooms.length}</span> favorite rooms
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Theme Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Theme Preference
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  settings.theme === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <Sun className={`w-6 h-6 mx-auto mb-2 ${
                  settings.theme === 'light' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  settings.theme === 'light'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Light
                </p>
              </button>

              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  settings.theme === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <Moon className={`w-6 h-6 mx-auto mb-2 ${
                  settings.theme === 'dark' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  settings.theme === 'dark'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Dark
                </p>
              </button>

              <button
                onClick={() => handleThemeChange('auto')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  settings.theme === 'auto'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <MonitorSmartphone className={`w-6 h-6 mx-auto mb-2 ${
                  settings.theme === 'auto' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  settings.theme === 'auto'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  System
                </p>
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {settings.theme === 'auto'
                ? 'Theme will match your system preference'
                : `Theme is set to ${settings.theme} mode`}
            </p>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Receive real-time notifications for room updates
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, notifications_enabled: !settings.notifications_enabled })
              }
              className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                settings.notifications_enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-200 ${
                  settings.notifications_enabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900">
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">Email Reminders</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Get email reminders before your reservations
              </p>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, email_reminders: !settings.email_reminders })
              }
              className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                settings.email_reminders ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-200 ${
                  settings.email_reminders ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={fetchProfile}
          disabled={saving}
        >
          Reset
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings;
