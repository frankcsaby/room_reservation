import React, { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Info, Bell } from 'lucide-react';

/**
 * NotificationToast - Toast notification component for real-time alerts
 *
 * @param {string} type - Type of notification: 'success', 'error', 'info', 'warning'
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {number} duration - Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss)
 * @param {function} onClose - Callback when toast is closed
 * @param {string} position - Toast position: 'top-right', 'top-left', 'bottom-right', 'bottom-left'
 */
const NotificationToast = ({
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300); // Animation duration
  };

  if (!isVisible) return null;

  // Get styling based on notification type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: <Check className="h-5 w-5 text-green-600" />,
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <Info className="h-5 w-5 text-blue-600" />,
        };
    }
  };

  // Get position styles
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  const typeStyles = getTypeStyles();
  const positionClass = getPositionStyles();

  return (
    <div
      className={`fixed ${positionClass} z-50 max-w-sm w-full shadow-lg rounded-lg border-2 ${
        typeStyles.bg
      } ${typeStyles.border} ${
        isLeaving ? 'animate-slideOut' : 'animate-slideIn'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{typeStyles.icon}</div>
          <div className="ml-3 flex-1">
            {title && (
              <h3 className={`text-sm font-medium ${typeStyles.text}`}>
                {title}
              </h3>
            )}
            {message && (
              <p className={`mt-1 text-sm ${typeStyles.text} opacity-90`}>
                {message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className={`inline-flex rounded-md ${typeStyles.text} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * NotificationContainer - Container for managing multiple toast notifications
 */
export const NotificationContainer = ({ notifications = [], onRemove }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {notifications.map((notification, index) => (
        <div
          key={notification.id || index}
          className="pointer-events-auto"
          style={{
            position: 'fixed',
            top: `${4 + index * 6}rem`,
            right: '1rem',
          }}
        >
          <NotificationToast
            {...notification}
            onClose={() => onRemove(notification.id || index)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
