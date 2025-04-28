import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAppContext } from "@/store/AppContext";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/components/dashboard/Dashboard";
import DmaicTools from "@/components/dmaic/DmaicTools";
import Projects from "@/components/projects/Projects";
import DataManagement from "@/components/data/DataManagement";
import StorageConfig from "@/components/storage/StorageConfig";

type HomeParams = {
  tab?: string;
  phase?: string;
};

export default function HomePage() {
  const { user, setCurrentTab, setActivePhase } = useAppContext();
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
        return <Dashboard />; // Temporary fallback until Settings component is created
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
