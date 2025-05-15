import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, addDays, isBefore, parseISO, differenceInDays, isAfter, isSameDay, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Trash2, PlusCircle, Calendar as CalendarIcon, GripVertical, GripHorizontal } from "lucide-react";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../../components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "../../components/ui/resizable";

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
  const [timelineView, setTimelineView] = useState<'weeks' | 'months'>('weeks');
  const [taskColumnSize, setTaskColumnSize] = useState<number>(30); // Default 30% of available width
  const [dateRange, setDateRange] = useState({
    start: projectStartDate ? parseISO(projectStartDate) : new Date(),
    end: projectEndDate ? parseISO(projectEndDate) : addDays(new Date(), 30)
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Handle resizing the task column
  const handleColumnResize = (sizes: number[]) => {
    // Store the size of the task column (first panel)
    if (sizes.length > 0) {
      setTaskColumnSize(sizes[0]);
      // Save preference to localStorage for persistence
      localStorage.setItem('ganttTaskColumnSize', sizes[0].toString());
    }
  };
  
  // Load saved task column size from localStorage on component mount
  useEffect(() => {
    const savedSize = localStorage.getItem('ganttTaskColumnSize');
    if (savedSize) {
      setTaskColumnSize(Number(savedSize));
    }
  }, []);

  // Calculate number of days in the range
  const totalDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  
  // Generate dates for the Gantt chart timeline
  const dates = useMemo(() => {
    const result = [];
    let currentDate = new Date(dateRange.start);
    for (let i = 0; i < totalDays; i++) {
      result.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    return result;
  }, [dateRange, totalDays]);

  // Group dates by week
  const groupedDates = useMemo(() => {
    if (timelineView === 'weeks') {
      // For weeks view, group dates by week
      const weeks: Date[][] = [];
      let currentWeek: Date[] = [];
      let currentWeekStart: Date | null = null;
      
      dates.forEach(date => {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday as week start
        if (!currentWeekStart || !isSameDay(weekStart, currentWeekStart)) {
          if (currentWeek.length > 0) {
            weeks.push(currentWeek);
          }
          currentWeek = [date];
          currentWeekStart = weekStart;
        } else {
          currentWeek.push(date);
        }
      });
      
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }
      
      return weeks;
    } else {
      // For months view, group dates by month
      const months: Date[][] = [];
      let currentMonth: Date[] = [];
      let currentMonthValue: number | null = null;
      
      dates.forEach(date => {
        const monthValue = date.getMonth();
        if (currentMonthValue === null || monthValue !== currentMonthValue) {
          if (currentMonth.length > 0) {
            months.push(currentMonth);
          }
          currentMonth = [date];
          currentMonthValue = monthValue;
        } else {
          currentMonth.push(date);
        }
      });
      
      if (currentMonth.length > 0) {
        months.push(currentMonth);
      }
      
      return months;
    }
  }, [dates, timelineView]);

  // Check if a date is a milestone date
  const isMilestoneDate = (date: Date) => {
    if (!milestoneDates) return false;
    
    return Object.entries(milestoneDates).some(([_, milestoneDate]) => 
      milestoneDate && isSameDay(date, parseISO(milestoneDate))
    );
  };

  // Get the milestone label for a date
  const getMilestoneLabel = (date: Date) => {
    if (!milestoneDates) return '';
    
    const milestone = Object.entries(milestoneDates).find(([_, milestoneDate]) => 
      milestoneDate && isSameDay(date, parseISO(milestoneDate))
    );
    
    if (!milestone) return '';
    
    const [type] = milestone;
    const formatMap: Record<string, string> = {
      kickOff: 'Kick-Off',
      define: 'Define',
      measure: 'Measure',
      analyze: 'Analyze',
      improve: 'Improve',
      control: 'Control'
    };
    
    return formatMap[type] || type;
  };

  // Check if a task is late (end date is before today and progress < 100%)
  const isTaskLate = (task: GanttTask) => {
    const today = new Date();
    return task.progress < 100 && isBefore(parseISO(task.endDate), today);
  };

  // Get the style for a task bar in the timeline
  const getTaskBarStyle = (task: GanttTask) => {
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);
    
    // Calculate position and width
    const daysFromStart = Math.max(0, differenceInDays(taskStart, dateRange.start));
    const taskDuration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);
    
    const left = `${(daysFromStart / totalDays) * 100}%`;
    const width = `${(taskDuration / totalDays) * 100}%`;
    
    return {
      left,
      width,
      backgroundColor: isTaskLate(task) ? '#FCA5A5' : statusColors[task.status || 'not-started'].replace('bg-', ''),
      borderLeftColor: priorityColors[task.priority || 'medium'].replace('border-l-', '')
    };
  };

  // Fetch the tasks
  useEffect(() => {
    if (!projectId) return;
    
    const fetchTasks = async () => {
      try {
        console.log("Fetching tasks for project", projectId);
        const response = await fetch(`/api/projects/${projectId}/gantt-tasks`);
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        const data = await response.json();
        console.log("Received tasks:", data.tasks);
        setTasks(data.tasks || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tasks',
          variant: 'destructive'
        });
      }
    };
    
    fetchTasks();
    
    // Set up polling to refresh tasks every 3 seconds
    const intervalId = setInterval(fetchTasks, 3000);
    
    return () => clearInterval(intervalId);
  }, [projectId, toast]);

  // Set up form for adding/editing tasks
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      startDate: dateRange.start.toISOString().split('T')[0],
      endDate: addDays(dateRange.start, 7).toISOString().split('T')[0],
      progress: 0,
      dependencies: '',
      assignee: '',
      priority: 'medium',
      phase: 'define',
      status: 'not-started'
    }
  });

  // Mutation for saving tasks
  const saveTaskMutation = useMutation({
    mutationFn: async (task: GanttTask) => {
      const isEditMode = !!task.id;
      const url = isEditMode 
        ? `/api/gantt-tasks/${task.id}` 
        : `/api/projects/${projectId}/gantt-tasks`;
      const method = isEditMode ? 'PUT' : 'POST';
      
      return apiRequest(url, method, task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gantt-tasks`] });
      form.reset();
      setShowAddTask(false);
      setEditingTaskId(null);
      toast({
        title: 'Success',
        description: editingTaskId ? 'Task updated successfully' : 'Task added successfully'
      });
    },
    onError: (error) => {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to save task',
        variant: 'destructive'
      });
    }
  });

  // Mutation for deleting tasks
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest(`/api/gantt-tasks/${taskId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gantt-tasks`] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully'
      });
    },
    onError: (error) => {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive'
      });
    }
  });

  // Mutation for generating WBS tasks
  const generateWbsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/projects/${projectId}/gantt-tasks/generate-dmaic-wbs`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gantt-tasks`] });
      setIsGeneratingWBS(false);
      toast({
        title: 'Success',
        description: 'Default DMAIC WBS generated successfully'
      });
    },
    onError: (error) => {
      console.error('Error generating WBS:', error);
      setIsGeneratingWBS(false);
      toast({
        title: 'Error',
        description: 'Failed to generate WBS',
        variant: 'destructive'
      });
    }
  });

  // Handler for form submission
  const onSubmit = (values: TaskFormValues) => {
    const taskToSave: GanttTask = {
      ...values,
      projectId,
      id: editingTaskId || undefined
    };
    
    saveTaskMutation.mutate(taskToSave);
  };

  // Handler for editing a task
  const handleEditTask = (task: GanttTask) => {
    setEditingTaskId(task.id || null);
    form.reset({
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      progress: task.progress,
      dependencies: task.dependencies || '',
      assignee: task.assignee || '',
      priority: task.priority || 'medium',
      phase: task.phase,
      status: task.status || 'not-started'
    });
    setShowAddTask(true);
  };

  // Handlers for drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    setDropTargetIndex(index);
  };

  const handleDrop = async () => {
    if (draggedIndex === null || dropTargetIndex === null) return;
    
    // Reorder tasks
    const newTasks = [...tasks];
    const [removed] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropTargetIndex, 0, removed);
    
    setTasks(newTasks);
    setDraggedIndex(null);
    setDropTargetIndex(null);
    
    // Update order in the backend
    try {
      await apiRequest(`/api/projects/${projectId}/gantt-tasks/reorder`, 'POST', {
        taskIds: newTasks.map(task => task.id)
      });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task order',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="gantt-chart space-y-4 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-4 space-y-2 md:space-y-0">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Project Gantt Chart and Work Breakdown Structure</h3>
          <p className="text-muted-foreground text-sm">Manage and track project tasks and timelines</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className={cn(timelineView === 'weeks' ? 'bg-blue-100' : '')}
            onClick={() => setTimelineView('weeks')}
          >
            Week View
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className={cn(timelineView === 'months' ? 'bg-blue-100' : '')}
            onClick={() => setTimelineView('months')}
          >
            Month View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddTask(true)}
          >
            <PlusCircle size={16} className="mr-1" /> Add Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsGeneratingWBS(true);
              generateWbsMutation.mutate();
            }}
            disabled={isGeneratingWBS}
          >
            {isGeneratingWBS ? 'Generating...' : 'Generate Default DMAIC WBS'}
          </Button>
        </div>
      </div>
      
      {showAddTask && (
        <div className="bg-gray-50 border rounded-md p-4 mb-4">
          <h4 className="font-medium mb-3">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                
                <FormField
                  control={form.control}
                  name="dependencies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dependencies (Task IDs, comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1,2,3" {...field} />
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
                            disabled={(date) => isBefore(date, dateRange.start)}
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
                          onChange={e => field.onChange(Number(e.target.value))}
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
      <div className="gantt-wrapper overflow-x-auto">
        <div className="min-w-full">
          <ResizablePanelGroup 
            direction="horizontal" 
            onLayout={handleColumnResize}
            className="border-b"
          >
            <ResizablePanel 
              defaultSize={taskColumnSize} 
              minSize={20} 
              maxSize={50}
              className="flex"
            >
              <div className="gantt-task-info w-2/3 min-w-[180px] border-r p-2 bg-gray-100 font-medium">
                Task
              </div>
              <div className="gantt-assignee w-1/3 min-w-[80px] border-r p-2 bg-gray-100 font-medium">
                Assignee
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={100 - taskColumnSize} className="gantt-timeline flex">
              {timelineView === 'weeks' ? (
                // Week view
                groupedDates.map((week, weekIndex) => (
                  <div 
                    key={`week-${weekIndex}`}
                    className="flex flex-col flex-grow border-r"
                  >
                    {/* Week header */}
                    <div className="bg-blue-50 text-center p-1 border-b text-xs font-medium">
                      Week {getWeek(week[0])} ({format(week[0], 'MMM d')} - {format(week[week.length - 1], 'MMM d')})
                    </div>
                    {/* Days in week */}
                    <div className="flex border-b">
                      {week.map((date, dateIndex) => (
                        <div 
                          key={`day-${weekIndex}-${dateIndex}`}
                          className={cn(
                            "flex-1 min-w-[35px] text-center text-xs p-1 border-r",
                            dateIndex % 2 === 0 ? "bg-gray-50" : "bg-white",
                            isMilestoneDate(date) ? "bg-amber-50" : ""
                          )}
                        >
                          {format(date, 'd')}
                          {isMilestoneDate(date) && (
                            <div className="text-[9px] font-semibold text-amber-700">
                              {getMilestoneLabel(date)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
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
                      {/* Month header */}
                      <div className="bg-blue-50 text-center p-1 border-b text-xs font-medium">
                        {format(month[0], 'MMMM yyyy')}
                      </div>
                      {/* Weeks in month */}
                      <div className="flex flex-col">
                        {weeksInMonth.map((week, weekIndex) => (
                          <div 
                            key={`month-${monthIndex}-week-${weekIndex}`}
                            className="flex border-b"
                          >
                            <div
                              className={cn(
                                "flex-grow min-w-[50px] text-center text-xs p-1 border-r",
                                weekIndex % 2 === 0 ? "bg-gray-50" : "bg-white"
                              )}
                            >
                              <div className="font-medium">Week {getWeek(week[0])}</div>
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
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Task Rows */}
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <ResizablePanelGroup
                key={task.id || index}
                direction="horizontal"
                className={cn(
                  "border-b hover:bg-gray-50 transition-colors",
                  dropTargetIndex === index ? "bg-blue-50" : ""
                )}
              >
                <div 
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDropTargetIndex(null);
                  }}
                  className="absolute inset-0 z-10 opacity-0 cursor-move"
                >
                </div>
                <ResizablePanel 
                  defaultSize={taskColumnSize} 
                  minSize={20} 
                  maxSize={50}
                  className="flex"
                >
                  <div className="gantt-task-info w-2/3 min-w-[180px] border-r p-2 flex items-center">
                    <div className="mr-2 cursor-move">
                      <GripVertical size={16} className="text-gray-400" />
                    </div>
                    <div className="flex-grow">
                      <div className="text-[14px]">{task.name}</div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full"
                        onClick={() => handleEditTask(task)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => task.id && deleteTaskMutation.mutate(task.id)}
                        disabled={deleteTaskMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="gantt-assignee w-1/3 min-w-[80px] border-r p-2">
                    {task.assignee ? (
                      <div className="text-sm">{task.assignee}</div>
                    ) : (
                      <div className="text-sm text-gray-400">Not assigned</div>
                    )}
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={100 - taskColumnSize} className="gantt-timeline relative flex">
                  {/* Task Bar */}
                  <div 
                    className={cn(
                      "absolute h-5 top-2 rounded-sm border-l-2",
                      `border-l-${priorityColors[task.priority || 'medium'].replace('border-l-', '')}`
                    )}
                    style={getTaskBarStyle(task)}
                  >
                    <div className="absolute inset-0 flex items-center px-2">
                      <div 
                        className="h-3 bg-blue-500 rounded-sm" 
                        style={{ width: `${task.progress}%` }}
                      ></div>
                      <span className="ml-1 text-xs">{task.progress}%</span>
                    </div>
                  </div>
                  
                  {/* Timeline background cells */}
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
                  ) : (
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
                          <div className="flex flex-col flex-grow">
                            {weeksInMonth.map((week, weekIndex) => (
                              <div 
                                key={`task-month-week-bg-${monthIndex}-${weekIndex}`}
                                className={cn(
                                  "flex-1 border-r",
                                  weekIndex % 2 === 0 ? "bg-gray-50" : "bg-white",
                                  week.some(date => isMilestoneDate(date)) ? "bg-amber-50" : ""
                                )}
                              ></div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </ResizablePanel>
              </ResizablePanelGroup>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tasks yet. Click "Add Task" to create a new task, or "Generate Default DMAIC WBS" to create a standard work breakdown structure.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}