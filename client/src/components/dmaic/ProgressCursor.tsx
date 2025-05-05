import React from 'react';

interface ProgressCursorProps {
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue';
}

export function ProgressCursor({ status }: ProgressCursorProps) {
  // Status-based color mapping
  const colors = {
    'not-started': 'bg-gray-300', // Gray for not started
    'in-progress': 'bg-blue-500', // Blue for in progress
    'completed': 'bg-green-500',  // Green for completed
    'overdue': 'bg-red-500',      // Red for overdue
  };

  const bgColor = colors[status];
  
  return (
    <div className="inline-flex items-center ml-2">
      <div className={`h-3 w-3 rounded-full ${bgColor}`}></div>
      <span className="ml-2 text-xs text-gray-500 capitalize">{status.replace('-', ' ')}</span>
    </div>
  );
}