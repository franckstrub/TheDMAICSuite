import React from 'react';

type ProgressCursorProps = {
  status?: 'not-started' | 'in-progress' | 'completed' | 'delayed' | 'at-risk';
};

export const ProgressCursor: React.FC<ProgressCursorProps> = ({ status = 'not-started' }) => {
  // Color mapping for different statuses
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'; // Green for completed
      case 'in-progress':
        return 'bg-blue-500'; // Blue for in progress
      case 'delayed':
        return 'bg-yellow-500'; // Yellow for delayed
      case 'at-risk':
        return 'bg-red-500'; // Red for at risk
      case 'not-started':
      default:
        return 'bg-gray-300'; // Gray for not started
    }
  };

  // Label mapping for different statuses
  const getStatusLabel = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'delayed':
        return 'Delayed';
      case 'at-risk':
        return 'At Risk';
      case 'not-started':
      default:
        return 'Not Started';
    }
  };

  return (
    <div className="ml-3 flex items-center">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
      <span className="ml-2 text-sm text-gray-600">{getStatusLabel()}</span>
    </div>
  );
};