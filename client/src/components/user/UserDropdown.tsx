import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, User, Settings, LogOut, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function UserDropdown() {
  const { user, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();

  const handleProfileClick = () => {
    navigate('/app/profile');
  };

  const handleSettingsClick = () => {
    navigate('/app/settings');
  };

  const handleSignOut = () => {
    window.location.href = '/api/logout';
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-10 px-3">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={user?.profileImageUrl || undefined} 
              alt={getDisplayName()}
              className="object-cover"
            />
            <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-medium text-gray-700">
            {getDisplayName()}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-medium text-gray-900">{getDisplayName()}</p>
          {user.email && (
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          )}
        </div>
        
        <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          Your Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}