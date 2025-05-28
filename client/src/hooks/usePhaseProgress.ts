import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface PhaseProgressData {
  define: number;
  measure: number;
  analyze: number;
  improve: number;
  control: number;
}

export function usePhaseProgress(projectId: number): PhaseProgressData {
  // Fetch tasks for the project
  const { data: tasksData } = useQuery({
    queryKey: [`/api/projects/${projectId}/gantt-tasks`],
    enabled: !!projectId,
  });

  // Calculate phase progress based on tasks
  const phaseProgressData = useMemo(() => {
    const tasks = tasksData?.tasks || [];
    
    const calculatePhaseProgress = (phase: string) => {
      const phaseTasks = tasks.filter((task: any) => task.phase === phase);
      if (phaseTasks.length === 0) return 0;
      
      const totalProgress = phaseTasks.reduce((sum: number, task: any) => sum + (task.progress || 0), 0);
      return Math.round(totalProgress / phaseTasks.length);
    };

    return {
      define: calculatePhaseProgress('define'),
      measure: calculatePhaseProgress('measure'),
      analyze: calculatePhaseProgress('analyze'),
      improve: calculatePhaseProgress('improve'),
      control: calculatePhaseProgress('control'),
    };
  }, [tasksData]);

  return phaseProgressData;
}