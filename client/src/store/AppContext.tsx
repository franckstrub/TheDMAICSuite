import { createContext, useContext } from "react";
import { UserSettings } from "@shared/schema";

export type CurrencyType = 
  | "$" | "€" | "£" | "¥" | "₩" | "CHF" | "₹" | "₽" | "₺" | "A$" 
  | "C$" | "HK$" | "R$" | "R" | "₱" | "₴" | "฿" | "₦" | "SAR" 
  | "AED" | "zł" | "Ft" | "RM" | "S$" | "₲" | "ƒ" | "CLP" | "¥" 
  | "CN¥" | "DKK" | "SEK" | "NOK" | "ISK" | "₫" | "MXN" | "ARS"
  | "RON" | "CZK" | "BGN" | "ILS" | "EGP";

export function currencyISOToSymbol(iso: string): CurrencyType {
  const map: Record<string, CurrencyType> = {
    "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "KRW": "₩",
    "CHF": "CHF", "INR": "₹", "RUB": "₽", "TRY": "₺", "AUD": "A$",
    "CAD": "C$", "HKD": "HK$", "BRL": "R$", "ZAR": "R", "PHP": "₱",
    "UAH": "₴", "THB": "฿", "NGN": "₦", "SAR": "SAR", "AED": "AED",
    "PLN": "zł", "HUF": "Ft", "MYR": "RM", "SGD": "S$", "PYG": "₲",
    "AWG": "ƒ", "CLP": "CLP", "CNY": "CN¥", "DKK": "DKK", "SEK": "SEK",
    "NOK": "NOK", "ISK": "ISK", "VND": "₫", "MXN": "MXN", "ARS": "ARS",
    "RON": "RON", "CZK": "CZK", "BGN": "BGN", "ILS": "ILS", "EGP": "EGP"
  };
  return map[iso] || "$";
}

export type UserSettingsType = {
  emailNotifications: boolean;
  projectUpdates: boolean;
  phaseReminders: boolean;
  weeklyReports: boolean;
  theme: string;
  language: string;
  timezone: string;
  currency: CurrencyType;
  dateFormat: string;
  profileVisibility: string;
  dataSharing: boolean;
  analyticsOptIn: boolean;
};

export const defaultUserSettings: UserSettingsType = {
  emailNotifications: true,
  projectUpdates: true,
  phaseReminders: false,
  weeklyReports: true,
  theme: "light",
  language: "en",
  timezone: "UTC",
  currency: "$",
  dateFormat: "MM/DD/YYYY",
  profileVisibility: "team",
  dataSharing: false,
  analyticsOptIn: true,
};

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

// Function to save current route to localStorage
export const saveRouteToStorage = (route: string) => {
  localStorage.setItem('currentRoute', route);
};

// Function to get stored route from localStorage
export const getStoredRoute = (): string | null => {
  const storedRoute = localStorage.getItem('currentRoute');
  
  // Fix for incorrect "/apps" route - replace with "/app"
  if (storedRoute === '/apps') {
    console.log('Fixing incorrect route /apps to /app');
    localStorage.setItem('currentRoute', '/app');
    return '/app';
  }
  
  return storedRoute;
};

// Function to save the last visited DMAIC phase for a specific project
export const saveProjectPhase = (projectId: string | number, phase: string) => {
  const projectPhases = getProjectPhases();
  projectPhases[projectId.toString()] = phase;
  localStorage.setItem('projectPhases', JSON.stringify(projectPhases));
};

// Function to get the last visited DMAIC phase for a specific project
export const getProjectPhase = (projectId: string | number): string | null => {
  const projectPhases = getProjectPhases();
  return projectPhases[projectId.toString()] || null;
};

// Function to get all stored project phases
export const getProjectPhases = (): Record<string, string> => {
  const storedPhases = localStorage.getItem('projectPhases');
  if (storedPhases) {
    try {
      return JSON.parse(storedPhases);
    } catch (err) {
      console.error('Error parsing stored project phases:', err);
      localStorage.removeItem('projectPhases');
    }
  }
  return {};
};

// Function to build the default route for a project (either last phase or define phase)
export const getProjectDefaultRoute = (projectId: string | number): string => {
  const lastPhase = getProjectPhase(projectId);
  if (lastPhase) {
    return `/projects/${projectId}/${lastPhase}`;
  }
  // Default to define phase if no previous phase is stored
  return `/projects/${projectId}/define`;
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
  userSettings: UserSettingsType;
  setUserSettings: (settings: UserSettingsType) => void;
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
  setImplementationStatus: () => {},
  userSettings: defaultUserSettings,
  setUserSettings: () => {},
});

export const useAppContext = () => useContext(AppContext);
