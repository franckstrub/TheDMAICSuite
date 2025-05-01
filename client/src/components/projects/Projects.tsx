import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, getProgressColor, getStatusColor, getPhaseLabel } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CalendarIcon, 
  PlusCircle, 
  Search, 
  MoreHorizontal, 
  Ban, 
  Pause, 
  Play, 
  CheckCircle,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Projects() {
  const { user, setCurrentProject, setCurrentTab } = useAppContext();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  
  // Form state for new project
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    currentPhase: "define",
    status: "active",
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: "",
  });

  // Fetch projects - focus on ones created by current user if applicable
  const { data: projectsData, isLoading, isError } = useQuery({
    queryKey: ["/api/projects", user?.id],
    enabled: !!user?.id,
  });

  // Mutation for creating a new project
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      return apiRequest("POST", "/api/projects", {
        ...projectData,
        createdBy: user?.id,
        progress: 0
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setShowNewProjectDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      resetNewProjectForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive",
      });
    },
  });

  // Mutation for soft-deleting a project by changing its status
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      // Soft delete by setting status to "deleted" instead of actually deleting
      return apiRequest("PUT", `/api/projects/${projectId}`, { 
        status: 'deleted',
        lastUpdated: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project moved to trash",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move project to trash",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for permanently deleting a project
  const permanentDeleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("DELETE", `/api/projects/${projectId}`, { userId: user?.id });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to permanently delete project",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating a project's status
  const updateProjectStatusMutation = useMutation({
    mutationFn: async (data: { projectId: number; status: string }) => {
      console.log("Sending API request to update project status:", data);
      const response = await apiRequest("PUT", `/api/projects/${data.projectId}`, { 
        status: data.status,
        lastUpdated: new Date().toISOString()
      });
      console.log("API response for status update:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Status update successful:", data);
      toast({
        title: "Success",
        description: "Project status updated successfully",
      });
      setShowStatusChangeDialog(false);
      setSelectedProject(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      console.error("Status update failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update project status",
        variant: "destructive",
      });
    },
  });

  const handleProjectClick = (project: any) => {
    setCurrentProject(project);
    setCurrentTab("dmaic");
    navigate(`/app/dmaic/${project.currentPhase.toLowerCase()}`);
  };

  const resetNewProjectForm = () => {
    setNewProject({
      title: "",
      description: "",
      currentPhase: "define",
      status: "active",
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate: "",
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectMutation.mutate(newProject);
  };

  const handleDeleteProject = (projectId: number) => {
    if (confirm("Are you sure you want to move this project to trash? You can recover it later.")) {
      deleteProjectMutation.mutate(projectId);
    }
  };
  
  const handlePermanentDelete = (projectId: number) => {
    if (confirm("Are you sure you want to permanently delete this project? This action CANNOT be undone.")) {
      permanentDeleteMutation.mutate(projectId);
    }
  };
  
  const openStatusChangeDialog = (project: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigating to project details
    setSelectedProject(project);
    setNewStatus(project.status.toLowerCase());
    setShowStatusChangeDialog(true);
  };
  
  const handleStatusChange = () => {
    if (!selectedProject || !newStatus) return;
    
    updateProjectStatusMutation.mutate({
      projectId: selectedProject.id,
      status: newStatus
    });
  };

  // Filter and search projects
  const filterProjects = (projects: any[]) => {
    if (!projects) return [];
    
    // Log projects data to inspect
    console.log("All projects:", projects);
    
    return projects.filter(project => {
      // Filter by status
      if (statusFilter !== 'all' && project.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      
      // Search by title or description
      if (searchQuery && !project.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !project.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  };

  // Sample projects data for demo/fallback
  const sampleProjects = [
    {
      id: 1,
      title: "Order Processing Optimization",
      description: "Streamline the order processing workflow to reduce cycle time",
      currentPhase: "improve",
      status: "Active",
      progress: 75,
      startDate: "2023-04-15",
      targetEndDate: "2023-07-30",
      createdBy: 1,
      lastUpdated: "2023-06-10T14:30:00Z"
    },
    {
      id: 2,
      title: "Quality Inspection Process",
      description: "Improve quality inspection to reduce defect rates",
      currentPhase: "analyze",
      status: "At Risk",
      progress: 45,
      startDate: "2023-03-01",
      targetEndDate: "2023-06-30",
      createdBy: 1,
      lastUpdated: "2023-05-20T09:15:00Z"
    },
    {
      id: 3,
      title: "Inventory Management",
      description: "Optimize inventory levels and reduce stockouts",
      currentPhase: "measure",
      status: "On Track",
      progress: 30,
      startDate: "2023-05-10",
      targetEndDate: "2023-09-15",
      createdBy: 1,
      lastUpdated: "2023-06-05T11:00:00Z"
    }
  ];

  // Logs for debugging
  console.log("Raw API response for projects:", projectsData);
  
  // Use API data - NEVER use sample data for this feature
  // Sort projects by ID to maintain a stable order regardless of status changes
  const sortedProjects = projectsData?.projects 
    ? [...projectsData.projects].sort((a, b) => a.id - b.id) 
    : [];
  const projects = filterProjects(sortedProjects);

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your Lean Six Sigma process improvement projects</p>
        </div>
        <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Enter the details for your new Lean Six Sigma project.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    placeholder="Enter project title"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Describe the project's purpose and goals"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <div className="relative">
                      <Input
                        id="startDate"
                        type="date"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="targetEndDate">Target End Date</Label>
                    <div className="relative">
                      <Input
                        id="targetEndDate"
                        type="date"
                        value={newProject.targetEndDate}
                        onChange={(e) => setNewProject({ ...newProject, targetEndDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newProject.status}
                      onValueChange={(value) => setNewProject({ ...newProject, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on hold">On Hold</SelectItem>
                        <SelectItem value="abandoned">Abandoned</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phase">Initial Phase</Label>
                    <Select
                      value={newProject.currentPhase}
                      onValueChange={(value) => setNewProject({ ...newProject, currentPhase: value })}
                    >
                      <SelectTrigger id="phase">
                        <SelectValue placeholder="Select phase" />
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
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewProjectDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on hold">On Hold</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="deleted">Trash</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Projects List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 mx-auto mb-4 border-t-2 border-primary rounded-full"></div>
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-red-500 mb-2">Failed to load projects</p>
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/projects"] })}>
                Retry
              </Button>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No projects found.</p>
              <Button onClick={() => setShowNewProjectDialog(true)}>
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Project</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow 
                      key={project.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleProjectClick(project)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{project.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {project.description || "No description provided"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getPhaseLabel(project.currentPhase)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`${getProgressColor(project.progress)} h-2 rounded-full`} style={{ width: `${project.progress}%` }}></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{project.progress}% Complete</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(project.startDate)}</div>
                          <div className="text-gray-500">to {formatDate(project.targetEndDate) || "TBD"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {formatDate(project.lastUpdated)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            
                            {/* Show different actions based on current status */}
                            {(project.status.toLowerCase() === 'on hold' || 
                              project.status.toLowerCase() === 'abandoned' || 
                              project.status.toLowerCase() === 'completed' ||
                              project.status.toLowerCase() === 'deleted') && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log("Reactivating project:", project.id, project.title);
                                  updateProjectStatusMutation.mutate({
                                    projectId: project.id,
                                    status: 'active'
                                  });
                                }}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                <span>{project.status.toLowerCase() === 'deleted' ? 'Restore from Trash' : 'Reactivate Project'}</span>
                              </DropdownMenuItem>
                            )}
                            
                            {project.status.toLowerCase() === 'active' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log("Putting project on hold:", project.id, project.title);
                                  updateProjectStatusMutation.mutate({
                                    projectId: project.id,
                                    status: 'on hold'
                                  });
                                }}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                <span>Put On Hold</span>
                              </DropdownMenuItem>
                            )}
                            
                            {project.status.toLowerCase() !== 'abandoned' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Are you sure you want to abandon this project?")) {
                                    console.log("Abandoning project:", project.id, project.title);
                                    updateProjectStatusMutation.mutate({
                                      projectId: project.id,
                                      status: 'abandoned'
                                    });
                                  }
                                }}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                <span>Abandon Project</span>
                              </DropdownMenuItem>
                            )}
                            
                            {project.status.toLowerCase() !== 'completed' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log("Marking project as completed:", project.id, project.title);
                                  updateProjectStatusMutation.mutate({
                                    projectId: project.id,
                                    status: 'completed'
                                  });
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                <span>Mark as Completed</span>
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            {project.status.toLowerCase() === 'deleted' ? (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePermanentDelete(project.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Permanently</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Move to Trash</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
