import { createContext, useContext } from "react";

export type CurrencyType = 
  | "$" | "€" | "£" | "¥" | "₩" | "CHF" | "₹" | "₽" | "₺" | "A$" 
  | "C$" | "HK$" | "R$" | "R" | "₱" | "₴" | "฿" | "₦" | "SAR" 
  | "AED" | "zł" | "Ft" | "RM" | "S$" | "₲" | "ƒ" | "CLP" | "¥" 
  | "CN¥" | "DKK" | "SEK" | "NOK" | "ISK" | "₫" | "MXN" | "ARS"
  | "RON" | "CZK" | "BGN" | "ILS" | "EGP";

export type ImplementationStatusType = 
  | "all"                  // All projects
  | "implemented"          // Completed projects
  | "not-implemented"      // Projects not yet completed
  | "active"               // Active projects
  | "completed"            // Completed projects (same as implemented)
  | "on-hold"              // On-hold projects
  | "abandoned"            // Abandoned projects
  | "active-completed";    // Active + Completed projects

// Function to save current project to localStorage for persistence between refreshes
export const saveCurrentProjectToStorage = (project: any) => {
  if (project) {
    localStorage.setItem('currentProject', JSON.stringify(project));
  }
};

// Function to retrieve current project from localStorage
export const getStoredCurrentProject = (): any | null => {
  const storedProject = localStorage.getItem('currentProject');
  if (storedProject) {
    try {
      return JSON.parse(storedProject);
    } catch (err) {
      console.error('Error parsing stored project:', err);
      localStorage.removeItem('currentProject');
    }
  }
  return null;
};

type AppContextType = {
  user: any | null;
  setUser: (user: any) => void;
  logout: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activePhase: string;
  setActivePhase: (phase: string) => void;
  currentProject: any | null;
  setCurrentProject: (project: any | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  implementationStatus: ImplementationStatusType;
  setImplementationStatus: (status: ImplementationStatusType) => void;
};

export const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  currentTab: "dashboard",
  setCurrentTab: () => {},
  activePhase: "define",
  setActivePhase: () => {},
  currentProject: null,
  setCurrentProject: () => {},
  sidebarOpen: false,
  setSidebarOpen: () => {},
  currency: "$",
  setCurrency: () => {},
  implementationStatus: "all",
  setImplementationStatus: () => {}
});

export const useAppContext = () => useContext(AppContext);
