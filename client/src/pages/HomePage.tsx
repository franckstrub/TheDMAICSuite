import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppContext, getStoredCurrentProject } from "@/store/AppContext";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/components/dashboard/Dashboard";
import DmaicTools from "@/components/dmaic/DmaicTools";
import Projects from "@/components/projects/Projects";
import DataManagement from "@/components/data/DataManagement";
import StorageConfig from "@/components/storage/StorageConfig";
import Settings from "@/components/settings/Settings";

type HomeParams = {
  tab?: string;
  phase?: string;
  projectId?: string;
};

export default function HomePage() {
  const { user, currentProject, currentTab, activePhase, setCurrentTab, setActivePhase, setCurrentProject } = useAppContext();
  const [location, navigate] = useLocation();
  const params = useParams<HomeParams>();
  
  // Redirect to landing page if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Priority 1: URL Params - highest priority for state determination
  // Priority 2: Current app state (from context)
  // Priority 3: Stored state (from localStorage)
  
  // Fetch projects for the user
  const { data: projectsData, isSuccess: projectsLoaded } = useQuery({ 
    queryKey: ["/api/projects"],
    staleTime: 30000 // Cache projects for 30 seconds to avoid repeated fetches
  });

  // Handle page refresh behavior - detect and restore state
  useEffect(() => {
    // Only run this effect when projects are loaded and we're on a page that might
    // need restoration (root app page or dashboard)
    if (!projectsLoaded) return;
    
    // Type guard to ensure projects exists and is an array
    const projects = Array.isArray((projectsData as any)?.projects) 
      ? (projectsData as any).projects as Array<{id: number, title: string}>
      : [];
    
    if (projects.length === 0) return;
    
    // Use URL params as first priority
    if (params.tab) {
      setCurrentTab(params.tab);
      
      if (params.tab === "dmaic" && params.phase) {
        setActivePhase(params.phase);
      }
      
      if (params.projectId) {
        const projectId = parseInt(params.projectId);
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          console.log(`Setting current project from URL to ID ${projectId} (${project.title})`);
          setCurrentProject(project);
          return; // Exit if we successfully handled restoration from URL
        }
      }
    }
    
    // If no URL projectId but we're on a blank app page or dashboard and have currentProject in context
    if ((location === '/app' || location === '/app/dashboard' || location === '/app/dmaic') && 
        currentProject && projects.some((p) => p.id === currentProject.id)) {
      console.log(`Restoring session for project: ${currentProject.id} from context`);
      // Navigate to the proper location based on current state
      navigate(`/app/dmaic/${activePhase}/${currentProject.id}`);
      return; // Exit if we successfully handled restoration from context
    }
    
    // Last resort: Check localStorage for stored project
    const storedProject = getStoredCurrentProject();
    if (storedProject && !currentProject && 
       (location === '/app' || location === '/app/dashboard') &&
       projects.some((p) => p.id === storedProject.id)) {
      console.log(`Restoring session for project: ${storedProject.id} from localStorage`);
      setCurrentProject(storedProject);
      
      // Also restore tabs and phases
      const storedTab = localStorage.getItem('currentTab');
      if (storedTab) setCurrentTab(storedTab);
      
      const storedPhase = localStorage.getItem('activePhase') || 'define';
      setActivePhase(storedPhase);
      
      // Navigate to restore the page
      navigate(`/app/dmaic/${storedPhase}/${storedProject.id}`);
    }
  }, [projectsLoaded, projectsData, location, params, currentProject, activePhase, navigate, setCurrentProject, setCurrentTab, setActivePhase]);

  if (!user) {
    return null;
  }

  // Determine which component to render based on currentTab
  const renderContent = () => {
    switch (params.tab) {
      case "dashboard":
        return <Dashboard />;
      case "projects":
        return <Projects />;
      case "dmaic":
        return <DmaicTools />;
      case "data":
        return <DataManagement />;
      case "storage":
        return <StorageConfig />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout>
      {renderContent()}
    </MainLayout>
  );
}
