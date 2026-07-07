import React from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

export const AlertBanner = ({ type = 'info', title, message, onDismiss }) => {
  const isFraud = type === 'fraud' || type === 'error';
  
  const bgClass = isFraud ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container';
  const Icon = isFraud ? AlertTriangle : (type === 'success' ? CheckCircle : Info);
  
  return (
    <div className={`rounded-md p-4 mb-4 flex items-start gap-3 shadow-md border-l-4 ${isFraud ? 'border-error' : 'border-primary'} ${bgClass}`}>
      <Icon className="shrink-0 mt-0.5" size={24} />
      <div className="flex-1">
        {title && <h4 className="font-bold mb-1">{title}</h4>}
        <p className="body-sm">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-70 hover:opacity-100 font-bold ml-2">
          ✕
        </button>
      )}
    </div>
  );
};
