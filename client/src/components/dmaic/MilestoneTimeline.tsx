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
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Left side - Timeline */}
      <div className="flex flex-col space-y-1 w-1/2">
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
          </div>
        </div>
      </div>
      
      {/* Right side - Progress Cursor */}
      <div className="flex items-center space-x-3 border-l pl-4">
        <div className={`flex flex-col items-center justify-center`}>
          <div className="flex items-center space-x-2">
            {/* Progress indicator */}
            <div className={`${colorClass} rounded-full w-4 h-4 flex items-center justify-center`}>
              <div className="bg-white rounded-full w-1.5 h-1.5"></div>
            </div>
            
            {/* Progress triangle */}
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 12 12" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className={colorClass.replace('bg-', 'text-')}
            >
              <path 
                d="M0 6L12 0L12 12L0 6Z" 
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
        
        {/* Progress percentage */}
        <div className="text-sm font-semibold">
          <span className={`${colorClass.replace('bg-', 'text-')}`}>{progress}%</span>
          <span className="text-gray-500 text-xs ml-1">complete</span>
        </div>
      </div>
    </div>
  );
}