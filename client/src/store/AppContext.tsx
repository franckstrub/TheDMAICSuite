import { createContext, useContext } from "react";

export type CurrencyType = 
  | "$" | "€" | "£" | "¥" | "₩" | "CHF" | "₹" | "₽" | "₺" | "A$" 
  | "C$" | "HK$" | "R$" | "R" | "₱" | "₴" | "฿" | "₦" | "SAR" 
  | "AED" | "zł" | "Ft" | "RM" | "S$" | "₲" | "ƒ" | "CLP" | "¥" 
  | "CN¥" | "DKK" | "SEK" | "NOK" | "ISK" | "₫" | "MXN" | "ARS"
  | "RON" | "CZK" | "BGN" | "ILS" | "EGP";

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
  setCurrency: () => {}
});

export const useAppContext = () => useContext(AppContext);
