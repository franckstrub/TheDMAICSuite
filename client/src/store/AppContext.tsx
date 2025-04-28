import { createContext, useContext } from "react";

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
  setSidebarOpen: () => {}
});

export const useAppContext = () => useContext(AppContext);
