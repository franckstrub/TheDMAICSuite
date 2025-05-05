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
    <div className={`flex flex-col space-y-1 ${className}`}>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatMilestoneDate(startDate)}</span>
        <span>{formatMilestoneDate(endDate)}</span>
      </div>
      <div className="relative pt-1">
        <div className="flex items-center justify-between">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${colorClass} h-2 rounded-full`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs font-semibold text-gray-600">{label}</span>
          <span className="text-xs font-medium text-gray-500">{progress}% complete</span>
        </div>
      </div>
    </div>
  );
}