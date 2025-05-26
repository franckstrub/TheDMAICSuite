import { useState } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, ChevronDown, HelpCircle, Menu } from "lucide-react";
import logoImage from "@/assets/logo.png";

export default function Header() {
  const { user, logout, setSidebarOpen } = useAppContext();
  const [location, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 focus:outline-none">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/FRANCK-PHOTO-BUSINESS-COLOR.png" />
                  <AvatarFallback>{getInitials(user?.fullName)}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium">{user?.fullName || "User"}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>Your Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
