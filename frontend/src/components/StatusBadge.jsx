import React from 'react';
import { Check, Clock, X, AlertTriangle } from 'lucide-react';

/**
 * Hallmark-compliant StatusBadge
 * Distinguishable across 4 independent channels without relying on colour alone:
 * 1. Semantic text label ("Approved", "Pending Approval", "Rejected")
 * 2. Explicit geometric icon glyph (Check, Clock, Cross)
 * 3. Border style & radius geometry (Solid pill, Dashed box, Double/sharp contour)
 * 4. High-contrast OKLCH semantic palette (WCAG AAA contrast, APCA Lc > 65)
 */
export const StatusBadge = ({ status, size = 'md', className = '' }) => {
  const normalized = (status || '').toLowerCase().trim();

  let config = {
    label: status || 'Unknown',
    variant: 'neutral',
    icon: null,
    code: '---',
  };

  if (normalized.includes('approv')) {
    config = {
      label: 'Approved',
      variant: 'approved',
      icon: <Check size={size === 'sm' ? 12 : 14} aria-hidden="true" strokeWidth={2.5} />,
      code: 'APR',
    };
  } else if (normalized.includes('pend')) {
    config = {
      label: 'Pending Approval',
      variant: 'pending',
      icon: <Clock size={size === 'sm' ? 12 : 14} aria-hidden="true" strokeWidth={2.2} />,
      code: 'PND',
    };
  } else if (normalized.includes('reject')) {
    config = {
      label: 'Rejected',
      variant: 'rejected',
      icon: <X size={size === 'sm' ? 12 : 14} aria-hidden="true" strokeWidth={2.5} />,
      code: 'REJ',
    };
  } else {
    config = {
      label: status || 'Pending',
      variant: 'pending',
      icon: <AlertTriangle size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
      code: 'REV',
    };
  }

  return (
    <span
      className={`status-badge status-badge--${config.variant} status-badge--${size} ${className}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span className="status-badge__glyph" aria-hidden="true">
        {config.icon}
      </span>
      <span className="status-badge__label">{config.label}</span>
      <span className="status-badge__code" aria-hidden="true">
        {config.code}
      </span>
    </span>
  );
};

export default StatusBadge;
