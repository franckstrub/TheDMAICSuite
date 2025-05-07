import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppContext, useAppContext, CurrencyType, ImplementationStatusType, saveCurrentProjectToStorage, getStoredCurrentProject } from "@/store/AppContext";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import HomePage from "@/pages/HomePage";
import MockupPage from "@/pages/MockupPage";

// Router component is declared after App to ensure context access
function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage}/>
      <Route path="/app" component={HomePage}/>
      <Route path="/app/:tab" component={HomePage}/>
      <Route path="/app/:tab/:phase" component={HomePage}/>
      <Route path="/app/:tab/:phase/:projectId" component={HomePage}/>
      <Route path="/mockup" component={MockupPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// URL restoration component that will be used inside the context provider
function ProjectRouteManager() {
  const { currentProject, activePhase } = useAppContext();
  const [location, navigate] = useLocation();
  
  // Handle URL redirection if we're starting on the default route but 
  // have a stored project and activePhase
  useEffect(() => {
    // Only attempt to redirect if we're at the app root or dashboard without specific paths
    if ((location === '/app' || location === '/app/dashboard') && currentProject && activePhase) {
      console.log(`Redirecting to stored project: ${currentProject.id} and phase: ${activePhase}`);
      navigate(`/app/dmaic/${activePhase}/${currentProject.id}`);
    }
  }, [location, currentProject, activePhase, navigate]);

  return null;
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [currentTab, setCurrentTabState] = useState("dashboard");
  const [activePhase, setActivePhaseState] = useState("define");
  
  // Wrappers for state setters that also save to localStorage
  const setCurrentTab = (tab: string) => {
    setCurrentTabState(tab);
    localStorage.setItem('currentTab', tab);
  };
  
  const setActivePhase = (phase: string) => {
    setActivePhaseState(phase);
    localStorage.setItem('activePhase', phase);
  };
  const [currentProject, setCurrentProjectState] = useState<any>(null);
  
  // Wrapper for setCurrentProject that also saves to localStorage
  const setCurrentProject = (project: any) => {
    setCurrentProjectState(project);
    if (project) {
      saveCurrentProjectToStorage(project);
    } else {
      localStorage.removeItem('currentProject');
    }
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyType>("$");
  const [implementationStatus, setImplementationStatus] = useState<ImplementationStatusType>("all");

  // Check for authenticated user and settings on app load
  useEffect(() => {
    // Load user data
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("user");
      }
    }
    
    // Load currency preference
    const storedCurrency = localStorage.getItem("currency");
    if (storedCurrency && ["$", "€", "£", "¥", "₩", "CHF"].includes(storedCurrency)) {
      setCurrency(storedCurrency as CurrencyType);
    }
    
    // Load stored project if available
    const storedProject = getStoredCurrentProject();
    if (storedProject) {
      console.log('Restoring current project from localStorage:', storedProject.title);
      setCurrentProject(storedProject);
      
      // Also restore currentTab and activePhase based on stored location
      const storedTab = localStorage.getItem('currentTab');
      if (storedTab) {
        setCurrentTab(storedTab);
      }
      
      const storedPhase = localStorage.getItem('activePhase');
      if (storedPhase) {
        setActivePhase(storedPhase);
      }
    }
  }, []);

  const login = (userData: any) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };
  
  // Update currency and save to localStorage
  const handleSetCurrency = (newCurrency: CurrencyType) => {
    setCurrency(newCurrency);
    localStorage.setItem("currency", newCurrency);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider 
        value={{ 
          user, 
          setUser: login, 
          logout,
          currentTab, 
          setCurrentTab,
          activePhase,
          setActivePhase,
          currentProject,
          setCurrentProject,
          sidebarOpen,
          setSidebarOpen,
          currency,
          setCurrency: handleSetCurrency,
          implementationStatus,
          setImplementationStatus
        }}
      >
        <TooltipProvider>
          <Toaster />
          <ProjectRouteManager />
          <AppRouter />
        </TooltipProvider>
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
