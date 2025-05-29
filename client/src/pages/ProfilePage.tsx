import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Mail, 
  Calendar, 
  Edit, 
  Save, 
  X, 
  Shield, 
  ExternalLink,
  Building,
  Phone,
  MapPin
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    displayName: "",
    bio: "",
    company: "",
    position: "",
    location: "",
    phone: "",
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'FS';
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
      // Extract name from email or use email prefix
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }
    return 'Franck Strub';
  };

  const handleEdit = () => {
    setEditedProfile({
      displayName: getDisplayName(),
      bio: "",
      company: "",
      position: "",
      location: "",
      phone: "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile preferences have been saved locally.",
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({
      displayName: "",
      bio: "",
      company: "",
      position: "",
      location: "",
      phone: "",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Management</h1>
        <p className="text-gray-600 mt-2">Manage your account information and platform preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-32 w-32 mb-4">
                  <AvatarImage 
                    src={user?.profileImageUrl || undefined} 
                    alt={getDisplayName()}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {getDisplayName()}
                </h2>
                
                <p className="text-sm text-gray-500 mb-3">{user?.email}</p>
                
                <Badge variant="secondary" className="mb-4">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified Account
                </Badge>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mb-3"
                  onClick={() => window.open('https://replit.com/account', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage on Replit
                </Button>
                
                <div className="w-full text-left space-y-2 text-xs">
                  <div className="flex items-center text-gray-600">
                    <User className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="truncate">ID: {user?.id}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span>Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Profile Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
              {!isEditing ? (
                <Button onClick={handleEdit} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  {isEditing ? (
                    <Input
                      id="displayName"
                      value={editedProfile.displayName}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="How you'd like to be addressed"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{getDisplayName()}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="mt-1">
                    <p className="text-sm text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Managed through your Replit account
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself and your experience with Lean Six Sigma..."
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {editedProfile.bio || "No bio provided yet. Click 'Edit Details' to add information about yourself."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  {isEditing ? (
                    <Input
                      id="company"
                      value={editedProfile.company}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Your company or organization"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">
                      {editedProfile.company || "Not specified"}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="position">Position/Title</Label>
                  {isEditing ? (
                    <Input
                      id="position"
                      value={editedProfile.position}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Your job title or role"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">
                      {editedProfile.position || "Not specified"}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={editedProfile.location}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="City, Country"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {editedProfile.location || "Not specified"}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Your contact number"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {editedProfile.phone || "Not specified"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Security & Platform Access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Account Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-800">Replit Authentication</p>
                    <p className="text-sm text-green-600">
                      Your account is secured through Replit's OAuth system
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600 bg-white">
                    Active & Secure
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-blue-800">Platform Access Level</p>
                    <p className="text-sm text-blue-600">
                      Full access to all Lean Six Sigma DMAIC tools and features
                    </p>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-600 bg-white">
                    Standard User
                  </Badge>
                </div>
                
                {user?.profileImageUrl && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">Profile Picture</p>
                      <p className="text-sm text-gray-600">
                        Synced from your Replit profile
                      </p>
                    </div>
                    <Badge variant="outline" className="text-gray-600 border-gray-600 bg-white">
                      Configured
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}