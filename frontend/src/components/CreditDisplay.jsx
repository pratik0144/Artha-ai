import React, { useState } from 'react';
import { Zap, Key } from 'lucide-react';
import { useCredits } from '../context/CreditContext';
import './CreditDisplay.css';

const CIRCUMFERENCE = 2 * Math.PI * 14; // radius = 14

export const CreditDisplay = () => {
  const {
    totalCredits,
    usedCredits,
    remaining,
    activeKeyIndex,
    keyStatuses,
    isLow,
    isCritical,
    isPulsing,
  } = useCredits();

  const [isExpanded, setIsExpanded] = useState(false);

  const usagePercent = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;
  const dashOffset = CIRCUMFERENCE - (usagePercent / 100) * CIRCUMFERENCE;

  // Build CSS class list for widget
  const widgetClasses = [
    'credit-widget',
    isExpanded && 'expanded',
    isPulsing && 'pulsing',
    isCritical ? 'critical' : isLow ? 'warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const ringFillClass = [
    'credit-ring-fill',
    isCritical ? 'critical' : isLow ? 'warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const progressFillClass = [
    'credit-progress-fill',
    isCritical ? 'critical' : isLow ? 'warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={widgetClasses}
      onClick={() => setIsExpanded((prev) => !prev)}
      role="status"
      aria-label={`API Credits: ${remaining} of ${totalCredits} remaining`}
    >
      {/* Main compact row */}
      <div className="credit-main">
        {/* Circular progress ring */}
        <div className="credit-ring">
          <svg viewBox="0 0 36 36">
            <defs>
              <linearGradient id="credit-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c68658" />
                <stop offset="100%" stopColor="#e6c365" />
              </linearGradient>
            </defs>
            <circle className="credit-ring-bg" cx="18" cy="18" r="14" />
            <circle
              className={ringFillClass}
              cx="18"
              cy="18"
              r="14"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="credit-ring-icon">
            <Zap size={12} />
          </div>
        </div>

        {/* Credit text */}
        <div className="credit-info">
          <span className="credit-count">
            {remaining}/{totalCredits}
          </span>
          <span className="credit-label">credits left</span>
        </div>

        {/* Key status dots */}
        <div className="credit-keys" title={`Active key: ${activeKeyIndex + 1}`}>
          {keyStatuses.map((key, idx) => {
            let dotClass = 'credit-key-dot ';
            if (!key.active) {
              dotClass += 'exhausted';
            } else if (idx === activeKeyIndex) {
              dotClass += 'active';
            } else {
              dotClass += 'inactive';
            }
            return <div key={idx} className={dotClass} />;
          })}
        </div>
      </div>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="credit-details">
          {/* Usage progress bar */}
          <div className="credit-progress-bar">
            <div
              className={progressFillClass}
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          {/* Active key detail */}
          <div className="credit-detail-row">
            <span className="credit-detail-key-label">
              <Key size={10} className="key-icon" />
              Active Key
            </span>
            <span className="detail-value">#{activeKeyIndex + 1}</span>
          </div>

          {/* Calls per key */}
          {keyStatuses.map((key, idx) => (
            <div className="credit-detail-row" key={idx}>
              <span>
                Key {idx + 1} {!key.active && '(exhausted)'}
              </span>
              <span className="detail-value">{key.calls} calls</span>
            </div>
          ))}

          {/* Warning messages */}
          {isCritical && (
            <div
              className="credit-detail-row"
              style={{ color: '#e05555', fontWeight: 600 }}
            >
              ⚠ Credits almost exhausted!
            </div>
          )}
          {isLow && !isCritical && (
            <div
              className="credit-detail-row"
              style={{ color: '#e6c365', fontWeight: 600 }}
            >
              ⚡ Credits running low
            </div>
          )}
        </div>
      )}
    </div>
  );
};
