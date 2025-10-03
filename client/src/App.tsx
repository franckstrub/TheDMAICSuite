import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  AppContext, 
  CurrencyType, 
  ImplementationStatusType, 
  UserSettingsType,
  defaultUserSettings,
  currencyISOToSymbol,
  saveCurrentProjectToStorage, 
  getStoredCurrentProject,
  saveRouteToStorage,
  getStoredRoute
} from "@/store/AppContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import LandingPage from "@/pages/LandingPage";
import HomePage from "@/pages/HomePage";
import MockupPage from "@/pages/MockupPage";

import SettingsPage from "@/pages/SettingsPage";
import UserManagement from "@/pages/UserManagement";

function Router() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [hasRestoredRoute, setHasRestoredRoute] = useState(false);
  
  // Save the current route to localStorage whenever it changes (only for authenticated users)
  useEffect(() => {
    if (isAuthenticated && location !== '/' && location !== '/app') {
      saveRouteToStorage(location);
      console.log('Saved current route to localStorage:', location);
    }
  }, [location, isAuthenticated]);
  
  // On authentication success, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !isLoading && !hasRestoredRoute) {
      console.log('Authentication successful, current location:', location);
      
      // Always redirect to dashboard when on default routes
      if (location === '/' || location === '/app') {
        console.log('Redirecting to dashboard');
        navigate('/app/dashboard', { replace: true });
      }
      setHasRestoredRoute(true);
    }
  }, [isAuthenticated, isLoading, hasRestoredRoute, location, navigate]);
  
  // Reset restoration flag when authentication status changes
  useEffect(() => {
    if (!isAuthenticated) {
      setHasRestoredRoute(false);
    }
  }, [isAuthenticated]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={HomePage} />
          <Route path="/app" component={HomePage} />

          <Route path="/app/settings" component={SettingsPage} />
          <Route path="/app/admin/users" component={UserManagement} />
          <Route path="/app/:tab" component={HomePage} />
          <Route path="/app/:tab/:phase" component={HomePage} />
          <Route path="/app/:tab/:phase/:projectId" component={HomePage} />
          <Route path="/mockup" component={MockupPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
  const [userSettings, setUserSettings] = useState<UserSettingsType>(defaultUserSettings);

  // Check for authenticated user and settings on app load
  useEffect(() => {
    // Load user data
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      // Additional validation before parsing
      if (storedUser.trim() === '' || storedUser === 'undefined' || storedUser === 'null') {
        console.warn("Invalid stored user data, clearing:", storedUser);
        localStorage.removeItem("user");
        return;
      }
      
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse stored user:", error, "Data:", storedUser);
        localStorage.removeItem("user");
      }
    }
    
    // Load stored project if available
    const storedProject = getStoredCurrentProject();
    if (storedProject) {
      console.log('Restoring current project from localStorage:', storedProject.title);
      setCurrentProject(storedProject);
    }
  }, []);

  // Fetch and load userSettings from database when user is available
  useEffect(() => {
    if (!user) {
      console.log('No user, skipping settings load');
      return;
    }

    console.log('User found, loading settings for user:', user.id);

    const loadUserSettings = async () => {
      try {
        console.log('Fetching /api/settings...');
        const response = await fetch('/api/settings', {
          credentials: 'include',
        });
        
        console.log('Settings response status:', response.status);
        
        if (response.ok) {
          const dbSettings = await response.json();
          console.log('Loaded settings from database:', dbSettings);
          
          const loadedSettings: UserSettingsType = {
            emailNotifications: dbSettings.emailNotifications ?? defaultUserSettings.emailNotifications,
            projectUpdates: dbSettings.projectUpdates ?? defaultUserSettings.projectUpdates,
            phaseReminders: dbSettings.phaseReminders ?? defaultUserSettings.phaseReminders,
            weeklyReports: dbSettings.weeklyReports ?? defaultUserSettings.weeklyReports,
            theme: dbSettings.theme ?? defaultUserSettings.theme,
            language: dbSettings.language ?? defaultUserSettings.language,
            timezone: dbSettings.timezone ?? defaultUserSettings.timezone,
            currency: dbSettings.currency ? currencyISOToSymbol(dbSettings.currency) : defaultUserSettings.currency,
            dateFormat: dbSettings.dateFormat ?? defaultUserSettings.dateFormat,
            profileVisibility: dbSettings.profileVisibility ?? defaultUserSettings.profileVisibility,
            dataSharing: dbSettings.dataSharing ?? defaultUserSettings.dataSharing,
            analyticsOptIn: dbSettings.analyticsOptIn ?? defaultUserSettings.analyticsOptIn,
          };
          
          console.log('Converted currency from', dbSettings.currency, 'to', loadedSettings.currency);
          
          setUserSettings(loadedSettings);
          setCurrency(loadedSettings.currency);
          console.log('Currency set to:', loadedSettings.currency);
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
      }
    };

    loadUserSettings();
  }, [user]);

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
          setImplementationStatus,
          userSettings,
          setUserSettings
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
