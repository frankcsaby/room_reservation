import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import Button from './Button';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          variant === 'danger'
            ? 'bg-red-100 dark:bg-red-900/20'
            : 'bg-blue-100 dark:bg-blue-900/20'
        }`}>
          <AlertCircle className={`w-6 h-6 ${
            variant === 'danger'
              ? 'text-red-600 dark:text-red-400'
              : 'text-blue-600 dark:text-blue-400'
          }`} />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant={variant}
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmText}
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
