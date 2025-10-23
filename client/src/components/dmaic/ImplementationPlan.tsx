import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface ImplementationPlanProps {
  projectId: number;
}

interface Task {
  id?: number;
  taskName: string;
  description?: string;
  solutionId?: string;
  owner: string;
  startDate?: string;
  endDate?: string;
  status: "Not Started" | "In Progress" | "Completed" | "On Hold" | "Cancelled";
  isPilotTask: boolean;
  progressPercentage: number;
  notes?: string;
}

export default function ImplementationPlan({ projectId }: ImplementationPlanProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState("implementation");

  // Fetch tasks
  const { data: tasksData } = useQuery<{ tasks: Task[] }>({
    queryKey: [`/api/projects/${projectId}/implementation-plan-tasks`],
    enabled: !!projectId,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      return apiRequest('POST', `/api/projects/${projectId}/implementation-plan-tasks`, task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-plan-tasks`] });
      toast({ title: "Success", description: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...task }: Task) => {
      return apiRequest('PUT', `/api/implementation-plan-tasks/${id}`, task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-plan-tasks`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    },
  });

  // Save all tasks mutation
  const saveAllMutation = useMutation({
    mutationFn: async (tasksToSave: Task[]) => {
      const updatePromises = tasksToSave
        .filter(task => task.id)
        .map(({ id, ...task }) => apiRequest('PUT', `/api/implementation-plan-tasks/${id}`, task));
      
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-plan-tasks`] });
      toast({ title: "Success", description: "All tasks saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save tasks", variant: "destructive" });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return apiRequest('DELETE', `/api/implementation-plan-tasks/${taskId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-plan-tasks`] });
      toast({ title: "Success", description: "Task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    },
  });

  // Load tasks from API
  useEffect(() => {
    if (tasksData?.tasks) {
      setTasks(tasksData.tasks);
    }
  }, [tasksData]);

  // Add new task
  const addTask = (isPilot: boolean) => {
    const newTask: Partial<Task> = {
      taskName: "",
      description: "",
      owner: "",
      status: "Not Started",
      isPilotTask: isPilot,
      progressPercentage: 0,
      notes: "",
    };
    createTaskMutation.mutate(newTask);
  };

  // Update task field
  const updateTaskField = (index: number, field: keyof Task, value: string | number | boolean) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setTasks(updatedTasks);
  };

  // Save all tasks
  const saveAllTasks = () => {
    saveAllMutation.mutate(tasks);
  };

  // Delete task
  const deleteTask = (index: number) => {
    const task = tasks[index];
    if (task.id) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "On Hold": return "bg-yellow-100 text-yellow-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Filter tasks
  const implementationTasks = tasks.filter(t => !t.isPilotTask);
  const pilotTasks = tasks.filter(t => t.isPilotTask);

  // Render task table
  const renderTaskTable = (taskList: Task[], isPilot: boolean) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {isPilot ? "Pilot Plan Tasks" : "Implementation Tasks"}
        </h3>
        <Button onClick={() => addTask(isPilot)} size="sm" data-testid={`button-add-${isPilot ? 'pilot' : 'implementation'}-task`}>
          <Plus className="h-4 w-4 mr-2" />
          Add {isPilot ? "Pilot" : "Implementation"} Task
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Task Name</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="w-[120px]">Solution ID</TableHead>
              <TableHead className="min-w-[200px]">Owner</TableHead>
              <TableHead className="w-[130px]">Start Date</TableHead>
              <TableHead className="w-[130px]">End Date</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[120px]">Progress %</TableHead>
              <TableHead className="min-w-[150px]">Notes</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskList.map((task, globalIndex) => {
              const index = tasks.findIndex(t => t.id === task.id || (t === task));
              return (
                <TableRow key={task.id || index}>
                  <TableCell>
                    <Input
                      value={task.taskName}
                      onChange={(e) => updateTaskField(index, 'taskName', e.target.value)}
                      placeholder="Enter task name"
                      data-testid={`input-task-name-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={task.description || ""}
                      onChange={(e) => updateTaskField(index, 'description', e.target.value)}
                      placeholder="Task description"
                      className="min-h-[60px]"
                      data-testid={`textarea-description-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={task.solutionId || ""}
                      onChange={(e) => updateTaskField(index, 'solutionId', e.target.value)}
                      placeholder="S1, S2, etc."
                      data-testid={`input-solution-id-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={task.owner}
                      onChange={(e) => updateTaskField(index, 'owner', e.target.value)}
                      placeholder="Task owner"
                      data-testid={`input-owner-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={task.startDate || ""}
                      onChange={(e) => updateTaskField(index, 'startDate', e.target.value)}
                      data-testid={`input-start-date-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={task.endDate || ""}
                      onChange={(e) => updateTaskField(index, 'endDate', e.target.value)}
                      data-testid={`input-end-date-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={task.status} 
                      onValueChange={(value) => updateTaskField(index, 'status', value)}
                    >
                      <SelectTrigger data-testid={`select-status-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={task.progressPercentage}
                        onChange={(e) => updateTaskField(index, 'progressPercentage', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="w-[80px]"
                        data-testid={`input-progress-${index}`}
                      />
                      <Progress value={task.progressPercentage} className="w-full" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={task.notes || ""}
                      onChange={(e) => updateTaskField(index, 'notes', e.target.value)}
                      placeholder="Notes"
                      className="min-h-[60px]"
                      data-testid={`textarea-notes-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteTask(index)}
                      disabled={deleteTaskMutation.isPending}
                      data-testid={`button-delete-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {taskList.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No {isPilot ? "pilot" : "implementation"} tasks yet. Click "Add Task" to create one.
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Implementation and Pilot Plan</span>
          <Button 
            onClick={saveAllTasks} 
            disabled={saveAllMutation.isPending || tasks.length === 0}
            data-testid="button-save-all-tasks"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveAllMutation.isPending ? "Saving..." : "Save All Tasks"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="implementation">Implementation Tasks</TabsTrigger>
            <TabsTrigger value="pilot">Pilot Tasks</TabsTrigger>
          </TabsList>
          <TabsContent value="implementation" className="mt-4">
            {renderTaskTable(implementationTasks, false)}
          </TabsContent>
          <TabsContent value="pilot" className="mt-4">
            {renderTaskTable(pilotTasks, true)}
          </TabsContent>
        </Tabs>

        {/* Summary statistics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Total Tasks</p>
            <p className="text-2xl font-bold">{tasks.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === "Completed").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.status === "In Progress").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Overall Progress</p>
            <p className="text-2xl font-bold">
              {tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.progressPercentage, 0) / tasks.length) : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
