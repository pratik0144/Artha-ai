import React from 'react';

export const Card = ({ children, elevated = false, className = '', ...props }) => {
  const baseClass = elevated ? 'card-elevated' : 'card';
  
  return (
    <div className={`${baseClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
