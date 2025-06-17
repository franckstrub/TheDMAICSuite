import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, UserCheck, Settings, X, ArrowLeft } from "lucide-react";
import { UserRole } from "@shared/schema";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  role: UserRole;
  createdAt: string;
  organizationId: number;
}

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  member: "Member"
};

const roleBadgeVariants: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
  super_admin: "destructive",
  admin: "default",
  manager: "secondary",
  member: "outline"
};

const roleIcons: Record<UserRole, JSX.Element> = {
  super_admin: <Shield className="h-4 w-4" />,
  admin: <UserCheck className="h-4 w-4" />,
  manager: <Settings className="h-4 w-4" />,
  member: <Users className="h-4 w-4" />
};

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Access denied. Super admin privileges required.");
        }
        throw new Error("Failed to fetch users");
      }
      return response.json();
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user role");
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Updated",
        description: `User role updated to ${roleLabels[variables.role]}`
      });
      // Clear the selected role for this user
      setSelectedRoles(prev => {
        const updated = { ...prev };
        delete updated[variables.userId];
        return updated;
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleUpdateRole = (userId: string) => {
    const newRole = selectedRoles[userId];
    if (newRole) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading users...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const users: User[] = usersData?.users || [];

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>
            Manage user roles and permissions. Only super admins can modify user roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.companyName || "Individual"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariants[user.role]} className="flex items-center space-x-1 w-fit">
                        {roleIcons[user.role]}
                        <span>{roleLabels[user.role]}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedRoles[user.id] || ""}
                        onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateRole(user.id)}
                        disabled={!selectedRoles[user.id] || updateRoleMutation.isPending}
                      >
                        {updateRoleMutation.isPending ? "Updating..." : "Update"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}