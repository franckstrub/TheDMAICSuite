import React from 'react';
import { formatMilestoneDate, calculateMilestoneProgress, getTimelineColor } from '@/lib/utils';

interface MilestoneTimelineProps {
  startDate: string | null;
  endDate: string | null;
  label: string;
  className?: string;
}

export default function MilestoneTimeline({ 
  startDate, 
  endDate, 
  label,
  className = '' 
}: MilestoneTimelineProps) {
  // Don't render if we don't have both dates
  if (!startDate || !endDate) return null;
  
  const progress = calculateMilestoneProgress(startDate, endDate);
  const colorClass = getTimelineColor(progress);
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold text-gray-600 w-40">{label}</span>
        <div className="relative flex-1">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className={`${colorClass} h-1 rounded-full`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 space-x-2">
          <span className="text-xs">{formatMilestoneDate(startDate)}</span>
          <span className="text-xs mx-1">→</span>
          <span className="text-xs">{formatMilestoneDate(endDate)}</span>
          <span className="text-xs font-medium text-gray-500 ml-2">{progress}%</span>
        </div>
      </div>
    </div>
  );
}