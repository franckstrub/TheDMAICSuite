import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, isBefore, parseISO, differenceInDays, isAfter, isSameDay, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Trash2, PlusCircle, Calendar as CalendarIcon, GripVertical } from "lucide-react";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../components/ui/form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

// Define the task interface
export interface GanttTask {
  id?: number;
  projectId: number;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies?: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  phase: 'define' | 'measure' | 'analyze' | 'improve' | 'control';
  status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  lastUpdated?: string;
}

interface ProjectData {
  id: number;
  title: string;
  ganttViewMode?: 'weeks' | 'months' | 'years';
  // Other project properties as needed
}

// Define form validation schema
const taskSchema = z.object({
  name: z.string().min(1, { message: "Task name is required" }),
  startDate: z.string(),
  endDate: z.string(),
  progress: z.number().min(0).max(100),
  dependencies: z.string().optional(),
  assignee: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  phase: z.enum(['define', 'measure', 'analyze', 'improve', 'control']),
  status: z.enum(['not-started', 'in-progress', 'completed', 'on-hold']).optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface GanttChartProps {
  projectId: number;
  projectStartDate?: string;
  projectEndDate?: string;
  milestoneDates?: {
    kickOff?: string;
    define?: string;
    measure?: string;
    analyze?: string;
    improve?: string;
    control?: string;
  };
}

const phaseColors = {
  define: 'bg-blue-500',
  measure: 'bg-green-500',
  analyze: 'bg-yellow-500',
  improve: 'bg-purple-500',
  control: 'bg-red-500',
};

const priorityColors = {
  low: 'border-l-blue-400',
  medium: 'border-l-amber-400',
  high: 'border-l-red-500',
}

const statusColors = {
  'not-started': 'bg-gray-200',
  'in-progress': 'bg-blue-200',
  'completed': 'bg-green-200',
  'on-hold': 'bg-amber-200',
}

export default function GanttChart({ projectId, projectStartDate, projectEndDate, milestoneDates }: GanttChartProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [isGeneratingWBS, setIsGeneratingWBS] = useState(false);
  const [timelineView, setTimelineView] = useState<'weeks' | 'months' | 'years'>('months');

  // Save view mode preference when it changes
  const saveViewModeMutation = useMutation({
    mutationFn: async (viewMode: 'weeks' | 'months' | 'years') => {
      return await apiRequest("POST", `/api/projects/${projectId}/gantt-view-mode`, { viewMode });
    },
  });

  // Fetch project details to get the saved view preference
  const { data: projectData } = useQuery({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId
  });

  // Load saved view preference when project data is loaded
  useEffect(() => {
    // Default to 'months' if no saved preference exists
    let savedMode: 'weeks' | 'months' | 'years' = 'months';

    // Add debugging to verify projectData structure
    console.log(`Project data received:`, projectData);

    // Check if projectData contains the project object
    if (projectData && typeof projectData === 'object') {
      // Check different possible API response structures
      if ('project' in projectData && projectData.project) {
        // Single project object in { project: {...} } format
        const project = projectData.project as ProjectData;
        console.log(`Found project in projectData.project:`, project);

        if (project.ganttViewMode && ['weeks', 'months', 'years'].includes(project.ganttViewMode)) {
          savedMode = project.ganttViewMode;
          console.log(`Using saved view mode from projectData.project: ${savedMode}`);
        }
      } else if ('projects' in projectData && Array.isArray(projectData.projects)) {
        // Array of projects in { projects: [...] } format
        console.log(`Found projects array, looking for project ID: ${projectId}`);
        const project = projectData.projects.find(p => p.id === Number(projectId)) as ProjectData | undefined;

        if (project) {
          console.log(`Found matching project in array:`, project);

          if (project.ganttViewMode && ['weeks', 'months', 'years'].includes(project.ganttViewMode)) {
            savedMode = project.ganttViewMode;
            console.log(`Using saved view mode from projects array: ${savedMode}`);
          }
        }
      } else if ('id' in projectData && projectData.id === Number(projectId)) {
        // Direct project object
        console.log(`Found direct project object:`, projectData);
        const project = projectData as ProjectData;
        
        if (project.ganttViewMode && ['weeks', 'months', 'years'].includes(project.ganttViewMode)) {
          savedMode = project.ganttViewMode;
          console.log(`Using saved view mode from direct project object: ${savedMode}`);
        }
      }
    }

    console.log(`Setting timeline view to: ${savedMode}`);
    setTimelineView(savedMode);
  }, [projectData, projectId]);

  // Fetch tasks when component mounts or projectId changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!projectId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/gantt-tasks`);
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchTasks();
  }, [projectId]);
  
  // Convert milestone dates into Date objects for easy comparison
  const milestones = useMemo(() => {
    return {
      kickOff: milestoneDates?.kickOff ? parseISO(milestoneDates.kickOff) : null,
      define: milestoneDates?.define ? parseISO(milestoneDates.define) : null,
      measure: milestoneDates?.measure ? parseISO(milestoneDates.measure) : null,
      analyze: milestoneDates?.analyze ? parseISO(milestoneDates.analyze) : null,
      improve: milestoneDates?.improve ? parseISO(milestoneDates.improve) : null,
      control: milestoneDates?.control ? parseISO(milestoneDates.control) : null,
    };
  }, [milestoneDates]);
  
  const [dateRange, setDateRange] = useState({
    start: projectStartDate ? parseISO(projectStartDate) : new Date(),
    end: projectEndDate ? parseISO(projectEndDate) : addDays(new Date(), 30)
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate number of days in the range of project start and end dates
  const totalDays = differenceInDays(dateRange.end, dateRange.start) + 1;

  // Generate all dates within the range: days scale below a  selected week scale
  const allDates = Array.from({ length: totalDays }, (_, i) => addDays(dateRange.start, i));

  // Group dates by weeks, months, or years based on view mode
  const groupedDates = useMemo(() => {
    if (timelineView === 'weeks') {
      // Group by weeks (Sunday to Saturday)
      const weeks: Date[][] = [];
      let currentWeek: Date[] = [];
      let currentWeekStartDate: Date | null = null;

      allDates.forEach(date => {
        // Start a new week on Sunday or first date
        if (currentWeekStartDate === null || date.getDay() === 0) {
          if (currentWeek.length > 0) {
            weeks.push(currentWeek);
          }
          currentWeek = [date];
          currentWeekStartDate = date;
        } else {
          currentWeek.push(date);
        }
      });

      // Add the last week if it exists
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }

      return weeks;
    } else if (timelineView === 'months') {
      // Group by months
      const months: Date[][] = [];
      let currentMonth: Date[] = [];
      let currentMonthNumber: number | null = null;
      let currentYear: number | null = null;

      allDates.forEach(date => {
        const monthNumber = date.getMonth();
        const year = date.getFullYear();
        // Start a new month when month changes or year changes
        if (currentMonthNumber === null || monthNumber !== currentMonthNumber || year !== currentYear) {
          if (currentMonth.length > 0) {
            months.push(currentMonth);
          }
          currentMonth = [date];
          currentMonthNumber = monthNumber;
          currentYear = year;
        } else {
          currentMonth.push(date);
        }
      });

      // Add the last month if it exists
      if (currentMonth.length > 0) {
        months.push(currentMonth);
      }

      return months;
    } else {
      // Group by years
      const years: Date[][] = [];
      let currentYear: Date[] = [];
      let currentYearNumber: number | null = null;

      allDates.forEach(date => {
        const yearNumber = date.getFullYear();
        // Start a new year when year changes
        if (currentYearNumber === null || yearNumber !== currentYearNumber) {
          if (currentYear.length > 0) {
            years.push(currentYear);
          }
          currentYear = [date];
          currentYearNumber = yearNumber;
        } else {
          currentYear.push(date);
        }
      });

      // Add the last year if it exists
      if (currentYear.length > 0) {
        years.push(currentYear);
      }

      return years;
    }
  }, [allDates, timelineView]);

  // Using the milestones defined earlier

  // Initialize form with default values
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
      progress: 0,
      dependencies: '',
      assignee: '',
      priority: 'medium',
      phase: 'define',
      status: 'not-started',
    },
  });

  // Fetch tasks on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        console.log(`Fetching tasks for project ${projectId}...`);
        const response = await fetch(`/api/projects/${projectId}/gantt-tasks`);
        if (response.ok) {
          const data = await response.json();
          console.log(`Received ${data.tasks?.length || 0} tasks:`, data.tasks);
          setTasks(data.tasks || []);
        } else {
          console.error(`Failed to fetch tasks: ${response.status}`);
          toast({
            title: 'Error',
            description: 'Failed to load Gantt tasks',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load Gantt tasks',
          variant: 'destructive',
        });
      }
    };

    fetchTasks();

    // Set up an interval to periodically check for tasks (every 3 seconds)
    const intervalId = setInterval(fetchTasks, 60000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [projectId, toast]);

  // Update date range based on project dates
  useEffect(() => {
    if (projectStartDate && projectEndDate) {
      setDateRange({
        start: parseISO(projectStartDate),
        end: parseISO(projectEndDate)
      });
    }
  }, [projectStartDate, projectEndDate]);

  // Save task mutation
  const saveTaskMutation = useMutation({
    mutationFn: async (task: GanttTask) => {
      if (task.id) {
        // Update existing task
        return apiRequest("PUT", `/api/gantt-tasks/${task.id}`, task);
      } else {
        // Create new task
        return apiRequest("POST", `/api/projects/${projectId}/gantt-tasks`, task);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Task saved successfully',
      });

      // Immediately refetch tasks to update the UI
      const fetchTasks = async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/gantt-tasks`);
          if (response.ok) {
            const data = await response.json();
            setTasks(data.tasks || []);
            console.log("Tasks reloaded:", data.tasks);
          } else {
            console.error("Failed to reload tasks:", response.status);
          }
        } catch (error) {
          console.error('Error fetching tasks:', error);
        }
      };

      fetchTasks();

      // Also invalidate the query cache for future requests
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gantt-tasks`] });

      // Reset form and UI state
      form.reset();
      setShowAddTask(false);
      setEditingTaskId(null);
    },
    onError: (error) => {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to save task',
        variant: 'destructive',
      });
    }
  });

  // Generate DMAIC WBS mutation
  const generateDMAICWBSMutation = useMutation({
    mutationFn: async () => {
      // Pass milestone dates from the project charter to ensure proper phase dates
      return apiRequest("POST", `/api/projects/${projectId}/gantt-tasks/generate-dmaic-wbs`, {
        milestoneDates: {
          projectStart: projectStartDate,
          kickOff: milestoneDates?.kickOff,
          define: milestoneDates?.define,
          measure: milestoneDates?.measure,
          analyze: milestoneDates?.analyze,
          improve: milestoneDates?.improve,
          control: milestoneDates?.control,
          projectEnd: projectEndDate
        }
      });
    },
    onSuccess: (response: any) => {
      // Safely extract tasks count from response
      let tasksCount = 0;
      if (response && typeof response === 'object' && Array.isArray(response.tasks)) {
        tasksCount = response.tasks.length;
      }
      toast({
        title: 'Success',
        description: `DMAIC WBS created with ${tasksCount} tasks`,
      });

      // Immediately refetch tasks to update the UI
      const fetchTasks = async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/gantt-tasks`);
          if (response.ok) {
            const data = await response.json();
            setTasks(data.tasks || []);
            console.log("Tasks reloaded after WBS generation:", data.tasks);
          } else {
            console.error("Failed to reload tasks after WBS generation:", response.status);
          }
        } catch (error) {
          console.error('Error fetching tasks after WBS generation:', error);
        }
      };

      fetchTasks();

      // Also invalidate the query cache for future requests
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gantt-tasks`] });

      // Reset generating state
      setIsGeneratingWBS(false);
    },
    onError: (error) => {
      console.error('Error generating DMAIC WBS:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate DMAIC WBS',
        variant: 'destructive',
      });
      setIsGeneratingWBS(false);
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest("DELETE", `/api/gantt-tasks/${taskId}`, { projectId });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });

      // Immediately refetch tasks to update the UI
      const fetchTasks = async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/gantt-tasks`);
          if (response.ok) {
            const data = await response.json();
            setTasks(data.tasks || []);
            console.log("Tasks reloaded after delete:", data.tasks);
          } else {
            console.error("Failed to reload tasks after delete:", response.status);
          }
        } catch (error) {
          console.error('Error fetching tasks after delete:', error);
        }
      };

      fetchTasks();

      // Also invalidate the query cache for future requests
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gantt-tasks`] });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  });

  // Form submission handler
  const onSubmit = (values: TaskFormValues) => {
    const taskToSave: GanttTask = {
      ...values,
      projectId,
      id: editingTaskId || undefined,
    };

    console.log("Submitting task:", taskToSave);
    saveTaskMutation.mutate(taskToSave);
  };

  // Handle edit task
  const handleEditTask = (task: GanttTask) => {
    // Populate form with task data
    form.reset({
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      progress: task.progress,
      dependencies: task.dependencies || '',
      assignee: task.assignee || '',
      priority: task.priority || 'medium',
      phase: task.phase,
      status: task.status || 'not-started',
    });

    setEditingTaskId(task.id || null);
    setShowAddTask(true);
  };

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropTargetIndex(index);
  };

  // Handle drop to reorder tasks
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
      // Create a new array with the reordered tasks
      const newTasks = [...tasks];
      const [movedTask] = newTasks.splice(draggedIndex, 1);
      newTasks.splice(dropTargetIndex, 0, movedTask);

      // Update the task order in the UI immediately
      setTasks(newTasks);

      // Reset drag state
      setDraggedIndex(null);
      setDropTargetIndex(null);

      // TODO: Implement API to update task order on the server
      try {
        // This would be the API call to update task order
        // await apiRequest("POST", `/api/projects/${projectId}/gantt-tasks/reorder`, { taskIds: newTasks.map(t => t.id) });
      } catch (error) {
        console.error('Error updating task order:', error);
        toast({
          title: 'Error',
          description: 'Failed to update task order',
          variant: 'destructive',
        });
      }
    }
  };

  // Calculate the position and width of a task bar based on its start and end dates
  const getTaskBarStyle = (task: GanttTask): React.CSSProperties => {
    // Handle missing dates
    if (!task.startDate || !task.endDate) {
      console.error(`Missing dates for task ${task.name}:`, task.startDate, task.endDate);
      return { left: '0%', width: '3%', display: 'block' } as React.CSSProperties;
    }
    
    // Parse the task start and end dates
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);
    
    // Validate the parsed dates
    if (!(taskStart instanceof Date) || !(taskEnd instanceof Date) || 
        taskStart.toString() === 'Invalid Date' || taskEnd.toString() === 'Invalid Date') {
      console.error(`Invalid dates for task ${task.name}:`, task.startDate, task.endDate);
      return { left: '0%', width: '3%', display: 'block' } as React.CSSProperties;
    }
    
    // Make sure start date is before end date
    if (isAfter(taskStart, taskEnd)) {
      console.error(`Task ${task.name} has start date after end date:`, task.startDate, task.endDate);
      return { left: '0%', width: '3%', display: 'block' } as React.CSSProperties;
    }
    
    // Get the visible range start and end dates
    const visibleStartDate = new Date(dateRange.start);
    const visibleEndDate = new Date(dateRange.end);
    
    // Calculate total days in the visible timeline
    const totalDays = differenceInDays(visibleEndDate, visibleStartDate) + 1;
    
    // Handle tasks that start before or end after the visible range
    const effectiveTaskStart = isBefore(taskStart, visibleStartDate) ? visibleStartDate : taskStart;
    const effectiveTaskEnd = isAfter(taskEnd, visibleEndDate) ? visibleEndDate : taskEnd;
    
    // Calculate position (left offset) as percentage of total width
    const daysFromStart = differenceInDays(effectiveTaskStart, visibleStartDate);
    const leftPos = Math.max((daysFromStart / totalDays) * 100, 0); // Ensure minimum of 0%
    
    // Calculate width as percentage of total width
    const taskDuration = differenceInDays(effectiveTaskEnd, effectiveTaskStart) + 1;
    
    // For different view modes, we need to adjust the calculation to ensure proper scaling
    let widthPercentage;
    widthPercentage = taskDuration/totalDays * 100;
    widthPercentage = Math.max(widthPercentage, 2); // Ensure minimum width for visibility
    
    // Basic calculation - percentage of total timeline
    const basePercentage = (taskDuration / totalDays) * 100;
    
    if (timelineView === 'weeks') {
      // Week view - most detailed view
      // For week view, make sure even single-day tasks are clearly visible
      const dayWidth = 100 / totalDays; // Width of a single day
      // widthPercentage = taskDuration * dayWidth;
      
      // Minimum width for single-day tasks to ensure visibility
      // widthPercentage = Math.max(widthPercentage, 4);
    } 
    else if (timelineView === 'months') {
      // Month view - medium detail
      // In month view, adjust for better visibility while maintaining relative proportions
      // widthPercentage = basePercentage;
      
      // Ensure minimum width for short tasks
      // widthPercentage = Math.max(widthPercentage, 2);
    } 
    else if (timelineView === 'years') {
      // Year view - in this view we need to calculate column-based widths
      // For year view, we need to adjust width calculation to match month boundaries
      
      // Get month proportion of the task duration
      const startMonth = effectiveTaskStart.getMonth();
      const endMonth = effectiveTaskEnd.getMonth();
      const monthsCount = (endMonth - startMonth) + (effectiveTaskEnd.getFullYear() - effectiveTaskStart.getFullYear()) * 12;
      
      // In year view, each month is approximately 1/12 of total width, adjusted for visible range
      const visibleMonths = (visibleEndDate.getMonth() - visibleStartDate.getMonth()) + 
                           (visibleEndDate.getFullYear() - visibleStartDate.getFullYear()) * 12 + 1;
      
      // Adjust for month span (a task spanning 2 months should be about 2/visibleMonths of the width)
      const monthSpanWidth = 2*(monthsCount + 1) / visibleMonths * 100;
      
      // For very short tasks (less than a month), ensure they're at least one month wide in the view
      // widthPercentage = Math.max(basePercentage, monthSpanWidth);
      
      // Ensure minimum visibility
      // widthPercentage = Math.max(widthPercentage, 8);
    } 
    else {
      // Default fallback
      widthPercentage = basePercentage;
      widthPercentage = Math.max(widthPercentage, 1);
    }
    
    // Logging for debugging
    console.log(`Task: ${task.name}, Dates: ${task.startDate} to ${task.endDate}, View: ${timelineView}, Position: ${leftPos}%, Width: ${widthPercentage}%`);
    
    return {
      left: `${leftPos}%`,
      width: `${widthPercentage}%`,
      zIndex: 10,
      position: 'absolute',
      overflow: 'hidden',
      height: '2rem'
    };
  };

  // Check if a date is a milestone
  const isMilestoneDate = (date: Date) => {
    return Object.values(milestones).some(milestone => 
      milestone && isSameDay(date, milestone)
    );
  };

  // Get milestone label for a date
  const getMilestoneLabel = (date: Date) => {
    if (milestones.kickOff && isSameDay(date, milestones.kickOff)) return 'Kick-off';
    if (milestones.define && isSameDay(date, milestones.define)) return 'Define';
    if (milestones.measure && isSameDay(date, milestones.measure)) return 'Measure';
    if (milestones.analyze && isSameDay(date, milestones.analyze)) return 'Analyze';
    if (milestones.improve && isSameDay(date, milestones.improve)) return 'Improve';
    if (milestones.control && isSameDay(date, milestones.control)) return 'Control';
    return '';
  };

  // Determine if the task is late based on its end date and status
  const isTaskLate = (task: GanttTask) => {
    return task.status !== 'completed' && isAfter(new Date(), parseISO(task.endDate));
  };

  return (
    <div className="gantt-chart-container">
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-semibold">Project Timeline</h3>
        <div className="flex space-x-2">
          <div className="flex items-center border rounded-md overflow-hidden mr-2">
            <button
              onClick={() => {
                setTimelineView('weeks');
                // Save preference
                saveViewModeMutation.mutate('weeks');
              }}
              className={`px-3 py-1 text-sm ${timelineView === 'weeks' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              Weeks
            </button>
            <button
              onClick={() => {
                setTimelineView('months');
                // Save preference
                saveViewModeMutation.mutate('months');
              }}
              className={`px-3 py-1 text-sm ${timelineView === 'months' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              Months
            </button>
            <button
              onClick={() => {
                setTimelineView('years');
                // Save preference
                saveViewModeMutation.mutate('years');
              }}
              className={`px-3 py-1 text-sm ${timelineView === 'years' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
            >
              Years
            </button>
          </div>

          <Button
            onClick={() => {
              setIsGeneratingWBS(true);
              generateDMAICWBSMutation.mutate();
            }}
            disabled={isGeneratingWBS || generateDMAICWBSMutation.isPending}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
          >
            {isGeneratingWBS || generateDMAICWBSMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>Generate DMAIC WBS</>
            )}
          </Button>
          <Button 
            onClick={() => {
              form.reset(); // Reset form to defaults
              setEditingTaskId(null);
              setShowAddTask(!showAddTask);
            }}
            variant="outline"
            size="sm"
          >
            {showAddTask ? 'Cancel' : 'Add Task'}
          </Button>
        </div>
      </div>

      {/* Task Form */}
      {showAddTask && (
        <div className="p-4 border border-gray-200 rounded-md mb-6 bg-gray-50">
          <h4 className="text-md font-medium mb-4">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phase</FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-2 border rounded-md"
                          {...field}
                        >
                          <option value="define">Define</option>
                          <option value="measure">Measure</option>
                          <option value="analyze">Analyze</option>
                          <option value="improve">Improve</option>
                          <option value="control">Control</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => isBefore(date, dateRange.start) || isAfter(date, dateRange.end)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => 
                              isBefore(date, form.getValues().startDate ? parseISO(form.getValues().startDate) : dateRange.start) || 
                              isAfter(date, dateRange.end)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Progress (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-2 border rounded-md"
                          {...field}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select
                          className="w-full p-2 border rounded-md"
                          {...field}
                        >
                          <option value="not-started">Not Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="on-hold">On Hold</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter assignee name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dependencies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dependencies (comma separated task IDs)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1,3,5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setShowAddTask(false);
                    setEditingTaskId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={saveTaskMutation.isPending}
                >
                  {saveTaskMutation.isPending ? 'Saving...' : (editingTaskId ? 'Update Task' : 'Add Task')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Gantt Chart */}
      <div className="gantt-wrapper overflow-x-auto overflow-y-auto max-h-[600px]">
        <div className="min-w-full relative">
          {/* Date Headers - First Two Rows are Frozen */}
          <div className="flex border-b sticky top-0 z-30 bg-white">
            <div className="w-1/4 flex sticky left-0 z-40 bg-white">
              <div className="gantt-task-info w-2/3 min-w-[180px] border-r p-2 bg-gray-100 font-medium">
                Task
              </div>
              <div className="gantt-assignee w-1/3 min-w-[80px] border-r p-2 bg-gray-100 font-medium">
                Owner
              </div>
            </div>
            <div className="gantt-timeline w-3/4 flex">
              {timelineView === 'weeks' ? (
                // Week view
                groupedDates.map((week, weekIndex) => (
                  <div 
                    key={`week-${weekIndex}`}
                    className="flex flex-col flex-grow border-r"
                  >
                    {/* Week header - First row (always visible) */}
                    <div className="bg-blue-50 text-center p-1 border-b text-xs font-medium sticky top-0 z-30">
                      Week {getWeek(week[0])}
                      <div className="text-[10px]">
                        {format(week[0], 'MMM d')} - {format(week[week.length - 1], 'MMM d, yyyy')}
                      </div>
                    </div>
                    {/* Days in week - Second row (also frozen) */}
                    <div className="flex sticky top-10 z-20 bg-white">
                      {week.map((date, dateIndex) => (
                        <div 
                          key={`day-${weekIndex}-${dateIndex}`} 
                          className={cn(
                            "flex-1 min-w-[35px] text-center text-xs p-1 border-r",
                            isMilestoneDate(date) ? "bg-amber-100" : (dateIndex % 2 === 0 ? "bg-gray-50" : "bg-white")
                          )}
                        >
                          {format(date, 'd')}
                          {isMilestoneDate(date) && (
                            <div className="text-[9px] font-semibold text-amber-700 truncate">
                              {getMilestoneLabel(date)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : timelineView === 'months' ? (
                // Month view with weeks
                groupedDates.map((month, monthIndex) => {
                  // Group days into weeks for each month
                  const weeksInMonth: Date[][] = [];
                  let currentWeek: Date[] = [];
                  let currentWeekNumber: number | null = null;

                  month.forEach(date => {
                    const weekNumber = getWeek(date);
                    if (currentWeekNumber === null || weekNumber !== currentWeekNumber) {
                      if (currentWeek.length > 0) {
                        weeksInMonth.push(currentWeek);
                      }
                      currentWeek = [date];
                      currentWeekNumber = weekNumber;
                    } else {
                      currentWeek.push(date);
                    }
                  });

                  // Add the last week if it exists
                  if (currentWeek.length > 0) {
                    weeksInMonth.push(currentWeek);
                  }

                  return (
                    <div 
                      key={`month-${monthIndex}`}
                      className="flex flex-col flex-grow border-r"
                    >
                      {/* Month header - First row (always visible) */}
                      <div className="bg-blue-50 text-center p-1 border-b text-xs font-medium sticky top-0 z-30">
                        {format(month[0], 'MMMM yyyy')}
                      </div>
                      {/* Weeks in month - Second row (also frozen) */}
                      <div className="flex sticky top-10 z-20 bg-white">
                        {weeksInMonth.map((week, weekIndex) => (
                          <div 
                            key={`month-${monthIndex}-week-${weekIndex}`}
                            className={cn(
                              "flex-grow min-w-[50px] text-center text-xs p-1 border-r",
                              weekIndex % 2 === 0 ? "bg-gray-50" : "bg-white",
                              week.some(date => isMilestoneDate(date)) ? "bg-amber-50" : ""
                            )}
                          >
                            <div className="font-medium">W{getWeek(week[0])}</div>
                            <div className="text-[10px]">
                              {format(week[0], 'MMM d')} - {format(week[week.length - 1], 'MMM d')}
                            </div>
                            {week.some(date => isMilestoneDate(date)) && (
                              <div className="text-[9px] font-semibold text-amber-700 mt-1">
                                {week.filter(date => isMilestoneDate(date)).map(date => 
                                  <span key={date.toISOString()} className="mr-1 px-1 bg-amber-100 rounded">
                                    {getMilestoneLabel(date)} ({format(date, 'd')})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Years view with months
                groupedDates.map((year, yearIndex) => {
                  // Group days into months for each year
                  const monthsInYear: Date[][] = [];
                  let currentMonth: Date[] = [];
                  let currentMonthNumber: number | null = null;

                  year.forEach(date => {
                    const monthNumber = date.getMonth();
                    if (currentMonthNumber === null || monthNumber !== currentMonthNumber) {
                      if (currentMonth.length > 0) {
                        monthsInYear.push(currentMonth);
                      }
                      currentMonth = [date];
                      currentMonthNumber = monthNumber;
                    } else {
                      currentMonth.push(date);
                    }
                  });

                  // Add the last month if it exists
                  if (currentMonth.length > 0) {
                    monthsInYear.push(currentMonth);
                  const calculateMonthWidth = (monthsInYear: Date[][]) => {
                    return 100 / monthsInYear.length; // Evenly distribute width across months
                  };
                  }
                  
                  return (
                    <div 
                      key={`year-${yearIndex}`}
                      className="flex flex-col flex-grow border-r"
                    >
                      {/* Year header - First row (always visible) */}
                      <div className="bg-blue-100 text-center p-1 border-b text-xs font-medium sticky top-0 z-30">
                        {format(year[0], 'yyyy')}
                      </div>
                      {/* Months in year - Second row (also frozen) min-w-[80px] */}
                      <div className="flex sticky top-10 z-20 bg-white">
                        {monthsInYear.map((month, monthIndex) => (
                          <div 
                            key={`year-${yearIndex}-month-${monthIndex}`}
                            className={cn(
                              "flex-grow text-center text-xs p-1 border-r",
                            )}
                            style={{ width: `${calculateMonthWidth(monthsInYear)}%` }}
                              monthIndex % 2 === 0 ? "bg-gray-50" : "bg-white",
                              month.some(date => isMilestoneDate(date)) ? "bg-amber-50" : ""
                            )}
                          >
                            <div className="font-medium">{format(month[0], 'MMM')}</div>
                            <div className="text-[10px]">
                              {format(month[0], 'd')} - {format(month[month.length - 1], 'd')}
                            </div>
                            {month.some(date => isMilestoneDate(date)) && (
                              <div className="text-[9px] font-semibold text-amber-700 mt-1">
                                {month.filter(date => isMilestoneDate(date)).map(date => 
                                  <span key={date.toISOString()} className="mr-1 px-1 bg-amber-100 rounded">
                                    {getMilestoneLabel(date)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Task Rows */}
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <div 
                key={task.id || index}
                className={cn(
                  "flex border-b hover:bg-gray-50 transition-colors",
                  dropTargetIndex === index ? "bg-blue-50" : ""
                )}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDropTargetIndex(null);
                }}
              >
                <div className="w-1/4 flex sticky left-0 z-20 bg-white">
                  <div className="gantt-task-info w-2/3 min-w-[180px] border-r p-2 flex items-center">
                    <div className="mr-1 cursor-move">
                      <GripVertical size={12} className="text-gray-400" />
                    </div>
                    <div className="flex-grow">
                      <div className="text-[12px]">{task.name}</div>
                    </div>
                    <div className="flex space-x-1 flex-col gap-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-4 rounded-full"
                        onClick={() => handleEditTask(task)}
                      >
                        {/* <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg> */}
                        <i className="fa fa-pencil" style={{ color: 'gray' }}></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-4 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => task.id && deleteTaskMutation.mutate(task.id)}
                        disabled={deleteTaskMutation.isPending}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                  <div className="gantt-assignee w-1/3 min-w-[80px] border-r p-2">
                    {task.assignee ? (
                      <div className="text-[12px]">{task.assignee}</div>
                    ) : (
                      <div className="text-sm text-gray-400">Not assigned</div>
                    )}
                  </div>
                </div>
                <div className="gantt-timeline w-3/4 relative flex">
                  {timelineView === 'weeks' ? (
                    // Week view background
                    groupedDates.map((week, weekIndex) => (
                      <div key={`task-week-bg-${weekIndex}`} className="flex flex-col flex-grow">
                        <div className="h-2 bg-transparent"></div> {/* Space for week header */}
                        <div className="flex flex-grow">
                          {week.map((date, dateIndex) => (
                            <div 
                              key={`task-day-bg-${weekIndex}-${dateIndex}`}
                              className={cn(
                                "flex-1 min-w-[35px] h-full border-r",
                                isMilestoneDate(date) ? "bg-amber-50" : (dateIndex % 2 === 0 ? "bg-gray-50" : "bg-white")
                              )}
                            ></div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : timelineView === 'months' ? (
                    // Month view background with weeks
                    groupedDates.map((month, monthIndex) => {
                      // Group days into weeks for each month
                      const weeksInMonth: Date[][] = [];
                      let currentWeek: Date[] = [];
                      let currentWeekNumber: number | null = null;

                      month.forEach(date => {
                        const weekNumber = getWeek(date);
                        if (currentWeekNumber === null || weekNumber !== currentWeekNumber) {
                          if (currentWeek.length > 0) {
                            weeksInMonth.push(currentWeek);
                          }
                          currentWeek = [date];
                          currentWeekNumber = weekNumber;
                        } else {
                          currentWeek.push(date);
                        }
                      });

                      // Add the last week if it exists
                      if (currentWeek.length > 0) {
                        weeksInMonth.push(currentWeek);
                      }

                      return (
                        <div key={`task-month-bg-${monthIndex}`} className="flex flex-col flex-grow">
                          <div className="h-2 bg-transparent"></div> {/* Space for month header */}
                          <div className="flex flex-grow">
                            {weeksInMonth.map((week, weekIndex) => (
                              <div 
                                key={`task-month-week-bg-${monthIndex}-${weekIndex}`}
                                className={cn(
                                  "flex-grow border-r",
                                  weekIndex % 2 === 0 ? "bg-gray-50" : "bg-white",
                                  week.some(date => isMilestoneDate(date)) ? "bg-amber-50" : ""
                                )}
                              ></div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Years view background with months
                    groupedDates.map((year, yearIndex) => {
                      // Group days into months for each year
                      const monthsInYear: Date[][] = [];
                      let currentMonth: Date[] = [];
                      let currentMonthNumber: number | null = null;

                      year.forEach(date => {
                        const monthNumber = date.getMonth();
                        if (currentMonthNumber === null || monthNumber !== currentMonthNumber) {
                          if (currentMonth.length > 0) {
                            monthsInYear.push(currentMonth);
                          }
                          currentMonth = [date];
                          currentMonthNumber = monthNumber;
                        } else {
                          currentMonth.push(date);
                        }
                      });

                      // Add the last month if it exists
                      if (currentMonth.length > 0) {
                        monthsInYear.push(currentMonth);
                      }

                      return (
                        <div key={`task-year-bg-${yearIndex}`} className="flex flex-col flex-grow">
                          <div className="h-2 bg-transparent"></div> {/* Space for year header */}
                          <div className="flex flex-grow">
                            {monthsInYear.map((month, monthIndex) => (
                              <div 
                                key={`task-year-month-bg-${yearIndex}-${monthIndex}`}
                                className={cn(
                                  "flex-grow border-r",
                                  monthIndex % 2 === 0 ? "bg-gray-50" : "bg-white",
                                  month.some(date => isMilestoneDate(date)) ? "bg-amber-50" : ""
                                )}
                              ></div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Task Bar */}
                  <div 
                    className={cn(
                      "absolute top-1 h-8 rounded flex items-center px-2 border-l-4 text-white text-xs",
                      phaseColors[task.phase] || 'bg-gray-500',
                      priorityColors[task.priority || 'medium'],
                      isTaskLate(task) ? 'border border-red-500' : ''
                    )}
                    style={getTaskBarStyle(task)}
                  >
                    <div className="truncate max-w-full">
                      {task.name} ({task.progress}%)
                    </div>

                    {/* Progress Overlay */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-black bg-opacity-20 rounded-l"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex border-b py-8">
              <div className="w-full text-center text-gray-500">
                No tasks added yet. Click "Add Task" to create your first task.<br />
                Click "Generate DMAIC WBS" to generate a DMAIC WBS (Work Breakdown Structure) from Project Charter.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="text-sm font-medium">Phases:</div>
        <div className="flex gap-4">
          {Object.entries(phaseColors).map(([phase, color]) => (
            <div key={phase} className="flex items-center">
              <div className={`w-4 h-4 rounded ${color} mr-1`}></div>
              <span className="text-sm capitalize">{phase}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-4">
        <div className="text-sm font-medium">Priorities:</div>
        <div className="flex gap-4">
          {Object.entries(priorityColors).map(([priority, color]) => (
            <div key={priority} className="flex items-center">
              <div className={`w-4 h-4 border-l-4 ${color} mr-1`}></div>
              <span className="text-sm capitalize">{priority}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-4">
        <div className="text-sm font-medium">Status:</div>
        <div className="flex gap-4">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center">
              <div className={`w-4 h-4 ${color} mr-1 rounded`}></div>
              <span className="text-sm capitalize">{status.replace('-', ' ')}</span>
            </div>
          ))}
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 border border-red-500 mr-1 rounded"></div>
            <span className="text-sm">Late</span>
          </div>
        </div>
      </div>
    </div>
  );
}