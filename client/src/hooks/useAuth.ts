import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Temporarily disable auth queries to prevent runtime crashes
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: false, // Disable the query entirely
  });

  return {
    user: { id: 1, username: "dev-user", email: "dev@example.com", organizationId: 1 }, // Mock user for development
    isLoading: false,
    isAuthenticated: true, // Always authenticated for development
  };
}