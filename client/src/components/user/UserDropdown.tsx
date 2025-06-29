import { useState, useRef } from "react";
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
import { ChevronDown, User, Settings, LogOut, HelpCircle, Camera } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ProfileOverlay from "./ProfileOverlay";

export default function UserDropdown() {
  const { user, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleProfileClick = () => {
    setProfileOpen(true);
  };

  const handleSettingsClick = () => {
    navigate('/app/settings');
  };

  const handleSignOut = () => {
    window.location.href = '/api/logout';
  };

  // Profile image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch('/api/auth/upload-profile-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile image updated",
        description: "Your profile image has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload profile image. Please try again.",
        variant: "destructive",
      });
      console.error('Image upload error:', error);
    },
  });

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        // Clear the file input
        if (event.target) {
          event.target.value = '';
        }
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "The selected image exceeds the 50MB limit. Please choose a smaller image.",
          variant: "destructive",
        });
        // Clear the file input
        if (event.target) {
          event.target.value = '';
        }
        return;
      }

      uploadImageMutation.mutate(file);
    }
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
    <>
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

          <DropdownMenuItem onClick={handleImageUpload} className="cursor-pointer" disabled={uploadImageMutation.isPending}>
            <Camera className="mr-2 h-4 w-4" />
            {uploadImageMutation.isPending ? 'Uploading...' : 'Change Profile Picture'}
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
      
      <ProfileOverlay 
        open={profileOpen} 
        onClose={() => setProfileOpen(false)} 
      />

      {/* Hidden file input for quick profile image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}