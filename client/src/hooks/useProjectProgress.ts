import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Hook to calculate overall project progress based on actual task data
 */
export function useProjectProgress(projectId: number) {
  // Fetch tasks for the project
  const { data: tasksData } = useQuery({
    queryKey: [`/api/projects/${projectId}/gantt-tasks`],
    enabled: !!projectId,
  });

  // Calculate overall progress based on all tasks
  const overallProgress = useMemo(() => {
    const tasks = tasksData?.tasks || [];
    if (tasks.length === 0) return 0;
    
    // Calculate average progress across all tasks
    const totalProgress = tasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
    return Math.round(totalProgress / tasks.length);
  }, [tasksData]);

  return overallProgress;
}

/**
 * Hook to calculate progress for multiple projects
 */
export function useMultipleProjectsProgress(projectIds: number[]) {
  const progressData = useMemo(() => {
    const result: Record<number, number> = {};
    
    // Initialize all projects with 0 progress
    projectIds.forEach(id => {
      result[id] = 0;
    });
    
    return result;
  }, [projectIds]);

  // Fetch tasks for each project individually
  const queries = projectIds.map(projectId => ({
    queryKey: [`/api/projects/${projectId}/gantt-tasks`],
    enabled: !!projectId,
  }));

  // Calculate progress for each project
  const calculatedProgress = useMemo(() => {
    const result: Record<number, number> = {};
    
    projectIds.forEach(projectId => {
      // This is a simplified version - in practice, you'd need to fetch each project's tasks
      // For now, we'll return 0 and let individual components handle their own calculation
      result[projectId] = 0;
    });
    
    return result;
  }, [projectIds]);

  return calculatedProgress;
}