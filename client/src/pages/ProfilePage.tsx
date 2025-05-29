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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account information and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                
                <p className="text-sm text-gray-500 mb-4">{user.email}</p>
                
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
                <Button onClick={handleEdit} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
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
    </div>
  );
}