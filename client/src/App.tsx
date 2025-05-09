import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNoRefetchQueries } from "@/hooks/useNoRefetchQueries";
import { 
  AppContext, 
  CurrencyType, 
  ImplementationStatusType, 
  saveCurrentProjectToStorage, 
  getStoredCurrentProject,
  saveRouteToStorage,
  getStoredRoute
} from "@/store/AppContext";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import HomePage from "@/pages/HomePage";
import MockupPage from "@/pages/MockupPage";

function Router() {
  const [location, navigate] = useLocation();
  
  // Save the current route to localStorage whenever it changes
  useEffect(() => {
    if (location !== '/' && location !== '/app') {
      saveRouteToStorage(location);
      console.log('Saved current route to localStorage:', location);
    }
  }, [location]);
  
  // On initial load, check if we have a stored route to navigate to
  useEffect(() => {
    const storedRoute = getStoredRoute();
    if (storedRoute && location === '/') {
      console.log('Restoring route from localStorage:', storedRoute);
      navigate(storedRoute);
    }
  }, []);
  
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

function App() {
  // Disable all automatic refetching in the entire application
  useNoRefetchQueries();
  
  const [user, setUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [activePhase, setActivePhase] = useState("define");
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
          <Router />
        </TooltipProvider>
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
