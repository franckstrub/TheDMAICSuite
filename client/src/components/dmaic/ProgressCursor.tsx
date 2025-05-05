import React from 'react';
import { getTimelineColor } from '@/lib/utils';

interface ProgressCursorProps {
  progress: number;
  label: string;
  className?: string;
}

export default function ProgressCursor({ 
  progress, 
  label,
  className = '' 
}: ProgressCursorProps) {
  const colorClass = getTimelineColor(progress);
  
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
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