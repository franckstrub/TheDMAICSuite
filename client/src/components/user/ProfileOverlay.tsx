import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Calendar, Edit, Save, X, Shield, UserCheck, Settings, Users, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@shared/schema";

// Phone country codes for dropdown
const phoneCountryCodes = [
  { value: "+1", label: "+1 (US/Canada)" },
  { value: "+33", label: "+33 (France)" },
  { value: "+44", label: "+44 (UK)" },
  { value: "+49", label: "+49 (Germany)" },
  { value: "+39", label: "+39 (Italy)" },
  { value: "+34", label: "+34 (Spain)" },
  { value: "+31", label: "+31 (Netherlands)" },
  { value: "+32", label: "+32 (Belgium)" },
  { value: "+41", label: "+41 (Switzerland)" },
  { value: "+43", label: "+43 (Austria)" },
  { value: "+45", label: "+45 (Denmark)" },
  { value: "+46", label: "+46 (Sweden)" },
  { value: "+47", label: "+47 (Norway)" },
  { value: "+358", label: "+358 (Finland)" },
  { value: "+351", label: "+351 (Portugal)" },
  { value: "+353", label: "+353 (Ireland)" },
  { value: "+81", label: "+81 (Japan)" },
  { value: "+82", label: "+82 (South Korea)" },
  { value: "+86", label: "+86 (China)" },
  { value: "+91", label: "+91 (India)" },
  { value: "+61", label: "+61 (Australia)" },
  { value: "+64", label: "+64 (New Zealand)" },
  { value: "+52", label: "+52 (Mexico)" },
  { value: "+55", label: "+55 (Brazil)" },
  { value: "+54", label: "+54 (Argentina)" },
  { value: "+27", label: "+27 (South Africa)" },
  { value: "+7", label: "+7 (Russia)" },
  { value: "+90", label: "+90 (Turkey)" },
  { value: "+966", label: "+966 (Saudi Arabia)" },
  { value: "+971", label: "+971 (UAE)" }
];

interface ProfileOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileOverlay({ open, onClose }: ProfileOverlayProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    phoneCountryCode: user?.phoneCountryCode || "",
    companyName: user?.companyName || "",
  });

  // Update mutation for profile
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: typeof editedProfile) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
      console.error('Profile update error:', error);
    },
  });

  // Reset form when user data changes or when starting to edit
  const handleStartEdit = () => {
    setEditedProfile({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      phoneCountryCode: user?.phoneCountryCode || "",
      companyName: user?.companyName || "",
    });
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editedProfile);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProfile({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      phoneCountryCode: user?.phoneCountryCode || "",
      companyName: user?.companyName || "",
    });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-64">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Get role badge properties
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { 
          variant: 'destructive' as const, 
          icon: Shield, 
          label: 'Super Admin',
          color: 'bg-red-600 text-white'
        };
      case 'admin':
        return { 
          variant: 'default' as const, 
          icon: UserCheck, 
          label: 'Admin',
          color: 'bg-blue-600 text-white'
        };
      case 'manager':
        return { 
          variant: 'secondary' as const, 
          icon: Settings, 
          label: 'Manager',
          color: 'bg-purple-600 text-white'
        };
      case 'member':
        return { 
          variant: 'outline' as const, 
          icon: User, 
          label: 'Member',
          color: 'bg-gray-600 text-white'
        };
      default:
        return { 
          variant: 'outline' as const, 
          icon: User, 
          label: 'Member',
          color: 'bg-gray-600 text-white'
        };
    }
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            <p className="text-gray-600 mt-1">Manage your account information and preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage 
                      src={user.profileImageUrl || undefined} 
                      alt={getDisplayName()}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    {getDisplayName()}
                  </h2>
                  
                  <p className="text-sm text-gray-500 mb-2">{user.email}</p>
                  
                  {/* Role Badge */}
                  <div className="flex items-center justify-center mb-4">
                    {(() => {
                      const role = user.role || 'member';
                      const roleInfo = getRoleBadge(role as UserRole);
                      const IconComponent = roleInfo.icon;
                      return (
                        <Badge 
                          variant={roleInfo.variant} 
                          className={`${roleInfo.color} flex items-center gap-1`}
                        >
                          <IconComponent className="h-3 w-3" />
                          {roleInfo.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  
                  <Badge variant="secondary" className="mb-4">
                    Verified Account
                  </Badge>
                  
                  <div className="w-full text-left space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      User ID: {user.id}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {user.email}
                    </div>
                    {user.phone && user.phone.length > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {user.phoneCountryCode || '+1'} {user.phone}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Profile Information</CardTitle>
                {!isEditing ? (
                  <Button onClick={handleStartEdit} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveProfile} 
                      size="sm"
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    {isEditing ? (
                      <Input
                        id="firstName"
                        value={editedProfile.firstName}
                        onChange={(e) => setEditedProfile(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter your first name"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{user.firstName || "Not provided"}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    {isEditing ? (
                      <Input
                        id="lastName"
                        value={editedProfile.lastName}
                        onChange={(e) => setEditedProfile(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter your last name"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{user.lastName || "Not provided"}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Phone Number Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phoneCountryCode">Country Code</Label>
                    {isEditing ? (
                      <Select 
                        value={editedProfile.phoneCountryCode} 
                        onValueChange={(value) => setEditedProfile(prev => ({ ...prev, phoneCountryCode: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select country code" />
                        </SelectTrigger>
                        <SelectContent>
                          {phoneCountryCodes.map((code) => (
                            <SelectItem key={code.value} value={code.value}>
                              {code.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{user.phoneCountryCode || "Not provided"}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={editedProfile.phone}
                        onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{user.phone || "Not provided"}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Company Name Section */}
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  {isEditing ? (
                    <Input
                      id="companyName"
                      value={editedProfile.companyName}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Enter your company name"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{user.companyName || "Not provided"}</p>
                  )}
                </div>

                <Separator />

                <div>
                  <Label>Email Address</Label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Email address is managed by your authentication provider and cannot be changed here.
                  </p>
                </div>

                <Separator />

                <div>
                  <Label>Account Type</Label>
                  <p className="mt-1 text-sm text-gray-900">Standard User</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Access to all standard features of the Lean Six Sigma platform.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Account Security */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Authentication</p>
                      <p className="text-sm text-gray-500">
                        Your account is secured through Replit authentication
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Profile Image</p>
                      <p className="text-sm text-gray-500">
                        Managed through your Replit account settings
                      </p>
                    </div>
                    {user.profileImageUrl && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        Set
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Admin Panel - Only visible to super_admin,admin and manager users */}
        {(user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager') && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  Administration Panel
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Super administrator tools and system management
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => {
                      navigate('/app/admin/users');
                      onClose();
                    }}
                    variant="outline"
                    className="flex items-center justify-start gap-3 h-auto p-4"
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">User Management</p>
                      <p className="text-sm text-gray-500">Manage user roles and permissions</p>
                    </div>
                  </Button>

                  <Button 
                    variant="outline"
                    className="flex items-center justify-start gap-3 h-auto p-4 opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                      <Settings className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">System Settings</p>
                      <p className="text-sm text-gray-500">Coming soon</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}