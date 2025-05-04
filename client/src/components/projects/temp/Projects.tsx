import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAppContext } from "@/hooks/use-app-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { 
  CalendarIcon, 
  PlusCircle, 
  Search, 
  MoreHorizontal, 
  Ban, 
  Pause, 
  Play, 
  CheckCircle,
  RefreshCw,
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
import { useState } from "react";
import { getProjectTypeColor, getPhaseLabel, getStatusColor, formatDate } from "@/lib/utils";

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
    projectType: "Green Belt",
    projectCategory: "Process Improvement",
    currentPhase: "define",
    status: "active",
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: "",
  });

  // Define the type for project data
  interface ProjectsResponse {
    projects: {
      id: number;
      title: string;
      description?: string;
      projectType: string;
      projectCategory: string;
      currentPhase: string;
      status: string;
      progress: number;
      startDate?: string;
      targetEndDate?: string;
      actualEndDate?: string;
      createdBy: number;
      lastUpdated: string;
      benefits?: any;
      costs?: any;
      softBenefits?: any[];
    }[];
  }

  // Fetch projects - focus on ones created by current user if applicable
  const { data: projectsData, isLoading, isError } = useQuery<ProjectsResponse>({
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

  // Filter and search projects
  const filterProjects = (projects: any[]) => {
    if (!projects) return [];
    
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

  const handleProjectClick = (project: any) => {
    setCurrentProject(project);
    setCurrentTab("dmaic");
    navigate(`/app/dmaic/${project.currentPhase.toLowerCase()}`);
  };

  const resetNewProjectForm = () => {
    setNewProject({
      title: "",
      description: "",
      projectType: "Green Belt",
      projectCategory: "Process Improvement",
      currentPhase: "define",
      status: "active",
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate: "",
    });
  };

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
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="flex items-center"
            onClick={(e) => {
              e.preventDefault();
              import('@/utils/projectSync').then(({ syncAllProjectsProgress }) => {
                syncAllProjectsProgress();
              });
            }}
            title="Update all projects' progress based on their DMAIC phases"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Progress
          </Button>
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
              {/* Form goes here */}
            </DialogContent>
          </Dialog>
        </div>
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
                    <TableHead className="w-[25%]">Project</TableHead>
                    <TableHead className="w-[12%]">Type</TableHead>
                    <TableHead className="w-[12%]">Phase</TableHead>
                    <TableHead className="w-[12%]">Status</TableHead>
                    <TableHead className="w-[10%]">Progress</TableHead>
                    <TableHead className="w-[10%]">Timeline</TableHead>
                    <TableHead className="w-[10%]">Last Updated</TableHead>
                    <TableHead className="w-[9%] text-right">Actions</TableHead>
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
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectTypeColor(project.projectType)}`}>
                          {project.projectType || "Not Specified"}
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
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-green-600 h-2.5 rounded-full" 
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {project.progress}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-600">
                          <div>Start: {formatDate(project.startDate)}</div>
                          <div>End: {formatDate(project.targetEndDate)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-500">
                          {formatDate(project.lastUpdated)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Action buttons would go here */}
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