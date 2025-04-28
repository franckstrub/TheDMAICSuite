import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";
import { getProgressColor, getStatusColor, getPhaseLabel } from "@/lib/utils";

export default function ProjectsTable() {
  const { user, setCurrentProject, setCurrentTab, navigate } = useAppContext();

  // Fetch projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !!user?.id,
  });

  const handleProjectClick = (project: any) => {
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

  if (!projects || projects.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500">
        <p>No projects found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* For demo purposes showing 3 sample projects */}
          <tr className="cursor-pointer hover:bg-gray-50" onClick={() => handleProjectClick({ id: 1, title: "Order Processing Optimization", currentPhase: "improve", status: "Active", progress: 75 })}>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-tasks text-indigo-500"></i>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">Order Processing Optimization</div>
                  <div className="text-xs text-gray-500">Updated 2 hours ago</div>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Active
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              Improve
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "75%" }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">75% Complete</div>
            </td>
          </tr>
          <tr className="cursor-pointer hover:bg-gray-50" onClick={() => handleProjectClick({ id: 2, title: "Quality Inspection Process", currentPhase: "analyze", status: "At Risk", progress: 45 })}>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 bg-red-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-exclamation-circle text-red-500"></i>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">Quality Inspection Process</div>
                  <div className="text-xs text-gray-500">Updated 1 day ago</div>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                At Risk
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              Analyze
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "45%" }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">45% Complete</div>
            </td>
          </tr>
          <tr className="cursor-pointer hover:bg-gray-50" onClick={() => handleProjectClick({ id: 3, title: "Inventory Management", currentPhase: "measure", status: "On Track", progress: 30 })}>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <i className="fas fa-clipboard-check text-purple-500"></i>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">Inventory Management</div>
                  <div className="text-xs text-gray-500">Updated 3 days ago</div>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                On Track
              </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              Measure
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: "30%" }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">30% Complete</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
