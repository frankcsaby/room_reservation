import React from 'react';

const Card = ({ children, className = '', hover = false, ...props }) => {
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200';
  const hoverStyles = hover ? 'hover:shadow-xl hover:scale-[1.02] cursor-pointer' : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
