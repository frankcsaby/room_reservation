import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      aria-label="Toggle theme"
    >
      <div
        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white dark:bg-gray-900 rounded-full shadow-md transform transition-all duration-200 flex items-center justify-center ${
          isDark ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-blue-500" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-yellow-500" />
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
