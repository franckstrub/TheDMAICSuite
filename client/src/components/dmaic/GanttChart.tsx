import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { PlusCircle, Calendar, Clock, Users, BarChart3 } from "lucide-react";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define task interface
interface GanttTask {
  id?: number;
  projectId: number;
  taskName: string;
  taskDescription?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  dmaicPhase: "define" | "measure" | "analyze" | "improve" | "control";
  dmaic_phase: "define" | "measure" | "analyze" | "improve" | "control"; // Backend field name (required)
  owner?: string | null;
  percentComplete: number;
  parentTaskId?: number | null;
  displayOrder: number;
  dependencies?: number[]; // IDs of tasks this task depends on (for future use)
  lastUpdated?: Date | string; // Backend tracking field
}

// Props for the component
interface GanttChartProps {
  projectId: number;
  userId?: number;
}

export default function GanttChart({ projectId, userId }: GanttChartProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for tasks
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  
  // Default new task
  const newTaskTemplate: GanttTask = {
    projectId,
    taskName: "",
    startDate: new Date(),
    endDate: new Date(),
    dmaicPhase: "define",
    dmaic_phase: "define", // Include both formats
    percentComplete: 0,
    displayOrder: 0
  };
  
  // State for new/editing task
  const [currentTask, setCurrentTask] = useState<GanttTask>(newTaskTemplate);
  
  // Response type for tasks API
  interface TasksResponse {
    tasks: GanttTask[];
  }
  
  // Query to fetch tasks
  const { data: tasksData, isLoading, isError } = useQuery<TasksResponse>({
    queryKey: ['/api/projects', projectId, 'gantt-tasks'],
    enabled: !!projectId,
  });
  
  // Mutation for creating a task
  const createTaskMutation = useMutation({
    mutationFn: (task: GanttTask) => {
      console.log("Submitting task to API:", JSON.stringify(task, null, 2));
      return apiRequest(`/api/projects/${projectId}/gantt-tasks`, 'POST', task);
    },
    onSuccess: (data) => {
      console.log("Task created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'gantt-tasks'] });
      toast({
        title: "Task Created",
        description: "The task has been created successfully.",
      });
      setIsTaskModalOpen(false);
      setCurrentTask(newTaskTemplate);
    },
    onError: (error: any) => {
      console.error("Error creating task:", error);
      // Try to extract more detailed error information
      let errorMessage = "Failed to create task. Please try again.";
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        
        // Extract validation errors if available
        if (error.response.data?.errors) {
          const validationErrors = error.response.data.errors
            .map((err: any) => `${err.path.join('.')}: ${err.message}`)
            .join('; ');
          errorMessage = `Validation errors: ${validationErrors}`;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for updating a task
  const updateTaskMutation = useMutation({
    mutationFn: (task: GanttTask) => {
      console.log("Updating task to API:", JSON.stringify(task, null, 2));
      return apiRequest(`/api/gantt-tasks/${task.id}`, 'PUT', task);
    },
    onSuccess: (data) => {
      console.log("Task updated successfully:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'gantt-tasks'] });
      toast({
        title: "Task Updated",
        description: "The task has been updated successfully.",
      });
      setIsTaskModalOpen(false);
      setEditingTask(null);
    },
    onError: (error: any) => {
      console.error("Error updating task:", error);
      // Try to extract more detailed error information
      let errorMessage = "Failed to update task. Please try again.";
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        
        // Extract validation errors if available
        if (error.response.data?.errors) {
          const validationErrors = error.response.data.errors
            .map((err: any) => `${err.path.join('.')}: ${err.message}`)
            .join('; ');
          errorMessage = `Validation errors: ${validationErrors}`;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting a task
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => {
      return apiRequest(`/api/gantt-tasks/${taskId}`, 'DELETE', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'gantt-tasks'] });
      toast({
        title: "Task Deleted",
        description: "The task has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Effect to update tasks when data changes
  useEffect(() => {
    if (tasksData?.tasks) {
      // Transform tasks to handle any backend/frontend property name differences
      const transformedTasks = tasksData.tasks.map((task: GanttTask) => {
        // If the task already has dmaicPhase, use it
        // Otherwise, try to get it from dmaic_phase
        const dmaicPhase = task.dmaicPhase || task.dmaic_phase || 'define';
        return {
          ...task,
          dmaicPhase
        } as GanttTask;
      });
      setTasks(transformedTasks);
    }
  }, [tasksData]);
  
  // Handler for adding a task
  const handleAddTask = () => {
    setEditingTask(null);
    setCurrentTask(newTaskTemplate);
    setIsTaskModalOpen(true);
  };
  
  // Handler for editing a task
  const handleEditTask = (task: GanttTask) => {
    setEditingTask(task);
    setCurrentTask(task);
    setIsTaskModalOpen(true);
  };
  
  // Handler for deleting a task
  const handleDeleteTask = (taskId: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };
  
  // Handler for saving a task
  const handleSaveTask = () => {
    try {
      // Transform the task data for backend compatibility
      const { dmaicPhase, ...restTask } = currentTask;
      
      // Ensure projectId is set and is a number
      const taskProjectId = typeof projectId === 'string' ? parseInt(projectId) : projectId;
      
      // Set the display order for new tasks
      if (!editingTask) {
        // Add at the end of the list, or start at 0 if no tasks
        const newDisplayOrder = tasks.length > 0 
          ? Math.max(...tasks.map(t => t.displayOrder || 0)) + 1 
          : 0;
        restTask.displayOrder = newDisplayOrder;
      }
      
      // Format dates properly - ensure they're valid dates first
      let startDateObj, endDateObj;
      
      try {
        startDateObj = typeof restTask.startDate === 'string' 
          ? new Date(restTask.startDate) 
          : restTask.startDate;
          
        endDateObj = typeof restTask.endDate === 'string' 
          ? new Date(restTask.endDate) 
          : restTask.endDate;
      } catch (err) {
        console.error("Date parsing error:", err);
        toast({
          title: "Invalid Date",
          description: "Please enter valid start and end dates.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate dates
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        toast({
          title: "Invalid Date",
          description: "Start date or end date is invalid.",
          variant: "destructive",
        });
        return;
      }
      
      // Create the final task object
      const transformedTask = {
        ...restTask,
        projectId: taskProjectId,
        startDate: startDateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        dmaic_phase: dmaicPhase, // Backend expects dmaic_phase
        dmaicPhase: dmaicPhase, // Keep dmaicPhase for the frontend type system
      };
      
      // Log what we're sending to server for debugging
      console.log("Sending task data:", JSON.stringify(transformedTask, null, 2));
      
      if (editingTask) {
        updateTaskMutation.mutate(transformedTask);
      } else {
        createTaskMutation.mutate(transformedTask);
      }
    } catch (error) {
      console.error("Error preparing task data:", error);
      toast({
        title: "Error",
        description: "Failed to prepare task data. Please check all fields and try again.",
        variant: "destructive",
      });
    }
  };
  
  // Helper to format dates for display
  const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
      return format(new Date(date), 'PP');
    }
    return format(date, 'PP');
  };
  
  // Get color based on DMAIC phase
  const getDmaicPhaseColor = (phase: string) => {
    switch (phase) {
      case 'define': return 'bg-blue-500';
      case 'measure': return 'bg-green-500';
      case 'analyze': return 'bg-yellow-500';
      case 'improve': return 'bg-orange-500';
      case 'control': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Project Gantt Chart</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentView('month')}
              className={cn(currentView === 'month' && "bg-secondary")}
            >
              Month
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentView('week')}
              className={cn(currentView === 'week' && "bg-secondary")}
            >
              Week
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentView('day')}
              className={cn(currentView === 'day' && "bg-secondary")}
            >
              Day
            </Button>
          </div>
        </div>
        <CardDescription>
          Manage and track project tasks across DMAIC phases.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Loading tasks...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-500">Error loading tasks. Please try again.</p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'gantt-tasks'] })}
                variant="outline"
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-center p-6">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No tasks yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a task for your project.
              </p>
              <Button 
                onClick={handleAddTask}
                className="mt-6"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>
        ) : (
          <div className="border rounded-md p-4">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium">Project Timeline</h3>
              <Button onClick={handleAddTask}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <div className="w-full border rounded-md bg-gray-50 p-4 min-h-[400px]">
                {/* Gantt Chart Header */}
                <div className="flex border-b pb-2 mb-4">
                  <div className="w-1/4 font-semibold">Task Name</div>
                  <div className="w-1/6 font-semibold">Owner</div>
                  <div className="w-1/6 font-semibold">Phase</div>
                  <div className="w-1/6 font-semibold">Dates</div>
                  <div className="w-1/6 font-semibold">Progress</div>
                  <div className="w-1/12 font-semibold text-right">Actions</div>
                </div>
                
                {/* Gantt Chart Tasks */}
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center border-b border-gray-100 pb-2">
                      <div className="w-1/4 flex items-center">
                        <div 
                          className={`w-3 h-3 rounded-full mr-2 ${getDmaicPhaseColor(task.dmaicPhase)}`}
                        />
                        <span className="font-medium truncate">{task.taskName}</span>
                      </div>
                      <div className="w-1/6 text-sm text-gray-600">
                        {task.owner || "Unassigned"}
                      </div>
                      <div className="w-1/6">
                        <span className={`px-2 py-1 rounded-md text-xs text-white ${getDmaicPhaseColor(task.dmaicPhase)}`}>
                          {task.dmaicPhase.charAt(0).toUpperCase() + task.dmaicPhase.slice(1)}
                        </span>
                      </div>
                      <div className="w-1/6 text-sm">
                        <div>{formatDate(task.startDate)}</div>
                        <div className="text-gray-400">to {formatDate(task.endDate)}</div>
                      </div>
                      <div className="w-1/6">
                        <div className="bg-gray-200 h-2 rounded-full w-full">
                          <div 
                            className={`h-2 rounded-full ${getDmaicPhaseColor(task.dmaicPhase)}`}
                            style={{ width: `${task.percentComplete}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-right">{task.percentComplete}%</div>
                      </div>
                      <div className="w-1/12 flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditTask(task)}
                          className="h-8 w-8 p-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            <path d="m15 5 4 4"/>
                          </svg>
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteTask(task.id as number)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            <line x1="10" x2="10" y1="11" y2="17"/>
                            <line x1="14" x2="14" y1="11" y2="17"/>
                          </svg>
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Timeline View */}
                <div className="mt-8 border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Timeline View</h3>
                  <div className="relative">
                    {/* Phase Indicators */}
                    <div className="flex mb-2">
                      <div className="flex items-center mr-4">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                        <span className="text-xs">Define</span>
                      </div>
                      <div className="flex items-center mr-4">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                        <span className="text-xs">Measure</span>
                      </div>
                      <div className="flex items-center mr-4">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                        <span className="text-xs">Analyze</span>
                      </div>
                      <div className="flex items-center mr-4">
                        <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
                        <span className="text-xs">Improve</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-purple-500 mr-1"></div>
                        <span className="text-xs">Control</span>
                      </div>
                    </div>
                    
                    {/* Gantt Timeline Visualization */}
                    <div className="h-[300px] border rounded-md overflow-x-auto">
                      {tasks.length > 0 ? (
                        <div className="min-w-[800px] relative h-full p-4">
                          {/* Time scale */}
                          <div className="flex border-b mb-2 pb-1">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div key={i} className="flex-1 text-xs text-center">{i + 1}</div>
                            ))}
                          </div>
                          
                          {/* Task bars */}
                          <div className="space-y-4 relative">
                            {tasks.map((task) => {
                              // Calculate position and width of task bar
                              // This is a simplified calculation - in a real implementation, 
                              // you would calculate this based on actual dates and timeline scale
                              const startDate = new Date(task.startDate);
                              const endDate = new Date(task.endDate);
                              
                              // Simple calculation for demonstration purposes
                              // Assuming timeline spans 12 months
                              const start = Math.max(0, startDate.getMonth());
                              const end = Math.min(11, endDate.getMonth());
                              const duration = end - start + 1;
                              
                              const left = (start / 12) * 100;
                              const width = (duration / 12) * 100;
                              
                              return (
                                <div key={task.id} className="h-8 flex items-center">
                                  <div className="w-1/5 pr-2 text-sm font-medium truncate">
                                    {task.taskName}
                                  </div>
                                  <div className="w-4/5 relative h-6">
                                    <div 
                                      className={`absolute top-0 h-full rounded-md ${getDmaicPhaseColor(task.dmaicPhase)} flex items-center justify-center`}
                                      style={{ 
                                        left: `${left}%`, 
                                        width: `${width}%`,
                                        minWidth: '30px'
                                      }}
                                    >
                                      <span className="text-white text-xs truncate px-1">
                                        {task.percentComplete}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500">Add tasks to see the timeline</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update task details below." : "Enter task details below to create a new task."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="taskName">Task Name</Label>
              <Input
                id="taskName"
                value={currentTask.taskName}
                onChange={(e) => setCurrentTask({...currentTask, taskName: e.target.value})}
                placeholder="Enter task name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="taskDescription">Description</Label>
              <Textarea
                id="taskDescription"
                value={currentTask.taskDescription || ""}
                onChange={(e) => setCurrentTask({...currentTask, taskDescription: e.target.value})}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="flex">
                  <Input
                    id="startDate"
                    type="date"
                    value={typeof currentTask.startDate === 'string' 
                      ? currentTask.startDate
                      : format(currentTask.startDate, 'yyyy-MM-dd')}
                    onChange={(e) => setCurrentTask({...currentTask, startDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="flex">
                  <Input
                    id="endDate"
                    type="date"
                    value={typeof currentTask.endDate === 'string' 
                      ? currentTask.endDate
                      : format(currentTask.endDate, 'yyyy-MM-dd')}
                    onChange={(e) => setCurrentTask({...currentTask, endDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="dmaicPhase">DMAIC Phase</Label>
              <Select
                value={currentTask.dmaicPhase}
                onValueChange={(value) => 
                  setCurrentTask({...currentTask, dmaicPhase: value as GanttTask['dmaicPhase']})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="define">Define</SelectItem>
                  <SelectItem value="measure">Measure</SelectItem>
                  <SelectItem value="analyze">Analyze</SelectItem>
                  <SelectItem value="improve">Improve</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                value={currentTask.owner || ""}
                onChange={(e) => setCurrentTask({...currentTask, owner: e.target.value})}
                placeholder="Enter task owner"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="percentComplete">Progress ({currentTask.percentComplete}%)</Label>
              <Input
                id="percentComplete"
                type="range"
                min="0"
                max="100"
                value={currentTask.percentComplete}
                onChange={(e) => setCurrentTask({...currentTask, percentComplete: parseInt(e.target.value)})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} disabled={!currentTask.taskName}>
              {editingTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}