import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getProgressColor } from "@/lib/utils";

interface ProjectProgressBarProps {
  projectId: number;
  fallbackProgress?: number;
}

/**
 * Component that displays a progress bar with calculated progress from actual task data
 */
export default function ProjectProgressBar({ projectId, fallbackProgress = 0 }: ProjectProgressBarProps) {
  // Fetch tasks for the project
  const { data: tasksData } = useQuery({
    queryKey: [`/api/projects/${projectId}/gantt-tasks`],
    enabled: !!projectId,
  });

  // Calculate overall progress based on all tasks
  const calculatedProgress = useMemo(() => {
    const tasks = tasksData?.tasks || [];
    if (tasks.length === 0) return fallbackProgress;
    
    // Calculate average progress across all tasks
    const totalProgress = tasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
    return Math.round(totalProgress / tasks.length);
  }, [tasksData, fallbackProgress]);

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