import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getProgressColor } from "@/lib/utils";
import { usePhaseProgress } from "@/hooks/usePhaseProgress";

interface ProjectProgressBarProps {
  projectId: number;
  fallbackProgress?: number;
}

/**
 * Component that displays a progress bar with calculated progress from DMAIC phases
 */
export default function ProjectProgressBar({ projectId, fallbackProgress = 0 }: ProjectProgressBarProps) {
  // Get calculated phase progress data based on actual tasks
  const phaseProgressData = usePhaseProgress(projectId);

  // Calculate overall progress based on DMAIC phase progress data
  const calculatedProgress = useMemo(() => {
    if (!phaseProgressData) return fallbackProgress;
    
    const { define, measure, analyze, improve, control } = phaseProgressData;
    const totalProgress = define + measure + analyze + improve + control;
    return Math.round(totalProgress / 5); // Average of all 5 DMAIC phases
  }, [phaseProgressData, fallbackProgress]);

  return (
    <>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${getProgressColor(calculatedProgress)} h-2 rounded-full`} 
          style={{ width: `${calculatedProgress}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1">{calculatedProgress}% Complete</div>
    </>
  );
}