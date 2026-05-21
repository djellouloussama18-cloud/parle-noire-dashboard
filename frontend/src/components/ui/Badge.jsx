import React from 'react';

export default function Badge({
  children,
  variant = 'success', // success, warning, danger, primary, disabled
  className = ''
}) {
  let styles = "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-all duration-200";

  if (variant === 'success') {
    styles += " bg-accent-primary/10 border-accent-primary/20 text-accent-primary";
  } else if (variant === 'warning') {
    styles += " bg-status-warning/10 border-status-warning/20 text-status-warning";
  } else if (variant === 'danger') {
    styles += " bg-status-danger/10 border-status-danger/20 text-status-danger";
  } else if (variant === 'primary') {
    styles += " bg-accent-secondary/10 border-accent-secondary/20 text-accent-secondary";
  } else if (variant === 'disabled') {
    styles += " bg-text-disabled/10 border-text-disabled/20 text-text-disabled";
  }

  return (
    <span className={`${styles} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {children}
    </span>
  );
}
