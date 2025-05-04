import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { getProgressColor, getStatusColor, getPhaseLabel } from "@/lib/utils";

// Define the Project type for TypeScript
interface Project {
  id: number;
  title: string;
  description?: string;
  currentPhase: string;
  status: string;
  progress: number;
  startDate?: string;
  targetEndDate?: string;
  actualEndDate?: string | null;
  createdBy: number;
  lastUpdated: string;
  [key: string]: any; // For any additional properties
}

export default function ProjectsTable() {
  const { user, setCurrentProject, setCurrentTab } = useAppContext();
  const [location, navigate] = useLocation();

  // Fetch projects
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !!user?.id,
  });

  // Define projects with proper typing
  interface ProjectsResponse {
    projects: Project[];
  }
  
  const projects = projectsData as ProjectsResponse;

  const handleProjectClick = (project: Project) => {
    setCurrentProject(project);
    setCurrentTab("dmaic");
    navigate(`/app/dmaic/${project.currentPhase.toLowerCase()}`);
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center text-gray-500">
        <p>Loading projects...</p>
      </div>
    );
  }

  if (!projects || !projects.projects || projects.projects.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500">
        <p>No projects found.</p>
      </div>
    );
  }

  // Get the latest 3 projects for the dashboard
  const recentProjects = projects.projects.slice(0, 3);

  // Function to get status color
  const getStatusBgColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'active' || statusLower === 'in progress') return 'bg-green-100 text-green-800';
    if (statusLower === 'completed') return 'bg-purple-100 text-purple-800';
    if (statusLower === 'abandoned') return 'bg-red-100 text-red-800';
    if (statusLower === 'on hold') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  // Function to get phase icon color
  const getPhaseIconColor = (phase: string): string => {
    const phaseLower = phase.toLowerCase();
    if (phaseLower === 'define') return 'bg-blue-100 text-blue-500';
    if (phaseLower === 'measure') return 'bg-green-100 text-green-500';
    if (phaseLower === 'analyze') return 'bg-yellow-100 text-yellow-500';
    if (phaseLower === 'improve') return 'bg-purple-100 text-purple-500';
    if (phaseLower === 'control') return 'bg-indigo-100 text-indigo-500';
    return 'bg-gray-100 text-gray-500';
  };

  // Function to get the icon class for a project phase
  const getPhaseIcon = (phase: string): string => {
    const phaseLower = phase.toLowerCase();
    if (phaseLower === 'measure') return 'ruler';
    if (phaseLower === 'analyze') return 'chart-bar';
    if (phaseLower === 'improve') return 'tools';
    if (phaseLower === 'control') return 'check-circle';
    return 'clipboard-list'; // default for define
  };

  // Format the date to show how long ago it was updated
  const getTimeAgo = (dateString: string): string => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
    
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
    return `${Math.floor(diff / 2592000)} months ago`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[28%]">Project</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[18%]">Phase</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[16%]">Progress</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {recentProjects.map((project) => (
            <tr 
              key={project.id} 
              className="cursor-pointer hover:bg-gray-50" 
              onClick={() => handleProjectClick(project)}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-8 w-8 ${getPhaseIconColor(project.currentPhase)} rounded-md flex items-center justify-center`}>
                    <i className={`fas fa-${getPhaseIcon(project.currentPhase)}`}></i>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{project.title}</div>
                    <div className="text-xs text-gray-500">Updated {getTimeAgo(project.lastUpdated)}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  {project.projectType || "Not Specified"}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBgColor(project.status)}`}>
                  {project.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                {getPhaseLabel(project.currentPhase)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${getProgressColor(project.progress)} h-2 rounded-full`} 
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{project.progress}% Complete</div>
              </td>
            </tr>
          ))}
          
          {recentProjects.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-5 text-center text-gray-500">
                No projects available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
