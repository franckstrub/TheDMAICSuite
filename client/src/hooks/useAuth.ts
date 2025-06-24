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
    user: null, // Return null to simulate unauthenticated state
    isLoading: false,
    isAuthenticated: false, // Always unauthenticated to prevent auth-related crashes
  };
}