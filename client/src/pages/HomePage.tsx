import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/store/AppContext";
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
  const { user, currentProject, setCurrentTab, setActivePhase, setCurrentProject } = useAppContext();
  const [location, navigate] = useLocation();
  const params = useParams<HomeParams>();
  
  // Redirect to landing page if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Update currentTab and activePhase based on URL params
  useEffect(() => {
    if (params.tab) {
      setCurrentTab(params.tab);
      
      if (params.tab === "dmaic" && params.phase) {
        setActivePhase(params.phase);
      }
    }
  }, [params, setCurrentTab, setActivePhase]);
  
  // Fetch projects and handle the projectId parameter - with automatic refresh completely disabled
  const { data: projectsData } = useQuery({ 
    queryKey: ["/api/projects"],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    cacheTime: Infinity
  });
  
  // Update the current project based on the projectId URL parameter
  useEffect(() => {
    if (projectsData && params.projectId) {
      const projectId = parseInt(params.projectId);
      // Find the project with the matching ID
      // Use type casting to handle the potential type mismatch
      const data = projectsData as any;
      const projects = data.projects || [];
      const project = projects.find((p: any) => p.id === projectId);
      if (project) {
        console.log(`Setting current project from URL to ID ${projectId} (${project.title})`);
        setCurrentProject(project);
      }
    } else if (projectsData && params.tab === "dmaic" && !params.projectId && currentProject) {
      // If we're on a DMAIC page without projectId but have a currentProject, update URL
      console.log(`Redirecting to project page with ID ${currentProject.id}`);
      const phase = params.phase || "define";
      navigate(`/app/dmaic/${phase}/${currentProject.id}`);
    }
  }, [projectsData, params, currentProject, setCurrentProject, navigate]);

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
