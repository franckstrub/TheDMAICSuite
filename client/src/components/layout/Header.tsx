import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/store/AppContext";
import { Button } from "@/components/ui/button";
import { Bell, HelpCircle, Menu } from "lucide-react";
import UserDropdown from "@/components/user/UserDropdown";
import logoImage from "@/assets/logo.png";

export default function Header() {
  const { setSidebarOpen } = useAppContext();
  const { isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 z-30 sticky top-0 left-0 right-0">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(true)} 
            className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center">
            <a href="/app" target="_self" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:text-primary-dark">
              <img src={logoImage} alt="Equable Solutions Logo" className="h-10 mr-3" />
              <span className="text-primary font-bold text-xl">Lean Six Sigma DMAIC Suite™</span>
            </a>
          </div>
        </div>
        
        {/* User Menu */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Bell className="w-5 h-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <HelpCircle className="w-5 h-5" />
          </Button>
          
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
