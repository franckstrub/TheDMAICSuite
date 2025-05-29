import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Mail,
  Calendar,
  Phone,
  Building,
  MapPin,
  Edit,
  Save,
  X,
  Camera,
} from "lucide-react";

const billingAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  billingAddress: billingAddressSchema.optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileOverlay({ open, onClose }: ProfileOverlayProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      companyName: "",
      billingAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
    },
  });

  // Reset form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        companyName: user.companyName || "",
        billingAddress: {
          street: user.billingAddress?.street || "",
          city: user.billingAddress?.city || "",
          state: user.billingAddress?.state || "",
          zipCode: user.billingAddress?.zipCode || "",
          country: user.billingAddress?.country || "",
        },
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      console.log("Sending profile update:", data);
      const response = await apiRequest("PATCH", "/api/auth/user", data);
      console.log("Profile update response:", response);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated || !user) {
    return null;
  }

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset();
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">DMAIC Suite Profile</DialogTitle>
          <DialogDescription>
            Manage your profile information for the Lean Six Sigma DMAIC Suite.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage 
                      src={user.profileImageUrl || undefined} 
                      alt={getDisplayName()}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0"
                    disabled
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {getDisplayName()}
                </h2>
                
                <p className="text-sm text-gray-500 mb-4">{user.email}</p>
                
                <Badge variant="secondary" className="mb-4">
                  DMAIC Suite User
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
                  {user.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {user.phone}
                    </div>
                  )}
                  {user.companyName && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2" />
                      {user.companyName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="border rounded-lg">
              <div className="flex flex-row items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">Profile Information</h3>
                {!isEditing ? (
                  <Button onClick={handleEdit} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      onClick={form.handleSubmit(onSubmit)} 
                      size="sm"
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            {isEditing ? (
                              <FormControl>
                                <Input {...field} placeholder="Enter your first name" />
                              </FormControl>
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">{user.firstName || "Not provided"}</p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            {isEditing ? (
                              <FormControl>
                                <Input {...field} placeholder="Enter your last name" />
                              </FormControl>
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">{user.lastName || "Not provided"}</p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Email Address</Label>
                        <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Email address cannot be changed here.
                        </p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            {isEditing ? (
                              <FormControl>
                                <Input {...field} placeholder="Enter your phone number" />
                              </FormControl>
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">{user.phone || "Not provided"}</p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Company Information */}
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          {isEditing ? (
                            <FormControl>
                              <Input {...field} placeholder="Enter your company name" />
                            </FormControl>
                          ) : (
                            <p className="mt-1 text-sm text-gray-900">{user.companyName || "Not provided"}</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    {/* Billing Address */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <Label className="text-base font-medium">Billing Address</Label>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="billingAddress.street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            {isEditing ? (
                              <FormControl>
                                <Input {...field} placeholder="Enter street address" />
                              </FormControl>
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">{user.billingAddress?.street || "Not provided"}</p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="billingAddress.city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              {isEditing ? (
                                <FormControl>
                                  <Input {...field} placeholder="City" />
                                </FormControl>
                              ) : (
                                <p className="mt-1 text-sm text-gray-900">{user.billingAddress?.city || "Not provided"}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="billingAddress.state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              {isEditing ? (
                                <FormControl>
                                  <Input {...field} placeholder="State" />
                                </FormControl>
                              ) : (
                                <p className="mt-1 text-sm text-gray-900">{user.billingAddress?.state || "Not provided"}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="billingAddress.zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP/Postal Code</FormLabel>
                              {isEditing ? (
                                <FormControl>
                                  <Input {...field} placeholder="ZIP Code" />
                                </FormControl>
                              ) : (
                                <p className="mt-1 text-sm text-gray-900">{user.billingAddress?.zipCode || "Not provided"}</p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="billingAddress.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            {isEditing ? (
                              <FormControl>
                                <Input {...field} placeholder="Country" />
                              </FormControl>
                            ) : (
                              <p className="mt-1 text-sm text-gray-900">{user.billingAddress?.country || "Not provided"}</p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </div>
            </div>

            {/* DMAIC Suite Preferences */}
            <div className="border rounded-lg mt-6">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">Suite Preferences</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Default Project Type</p>
                      <p className="text-sm text-gray-500">
                        Your preferred belt level for new projects
                      </p>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">
                      Green Belt
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Account Status</p>
                      <p className="text-sm text-gray-500">
                        Your current access level in the DMAIC Suite
                      </p>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary">
                      Active User
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}