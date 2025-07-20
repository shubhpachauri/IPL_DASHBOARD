import React from 'react';

interface LoaderProps {
  text?: string;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ text = 'Loading...', className = '' }) => (
  <div className={`flex items-center justify-center py-8 ${className}`}>
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    {text && (
      <span className="ml-3 text-blue-600 dark:text-blue-300 text-sm">{text}</span>
    )}
  </div>
);

export default Loader;
