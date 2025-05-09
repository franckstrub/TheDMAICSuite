import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

/**
 * Custom hook to completely disable all refetching in the application
 * This uses a more radical approach by overriding internal refetch methods
 */
export function useNoRefetchQueries() {
  useEffect(() => {
    // Save the original refetch function
    const originalRefetchQueries = queryClient.refetchQueries;
    
    // Override refetchQueries with a no-op function
    queryClient.refetchQueries = () => {
      console.log('⛔ Automatic refetch attempt intercepted and blocked');
      // Return a promise that resolves immediately without doing anything
      return Promise.resolve();
    };
    
    // Restore the original function on cleanup to avoid memory leaks
    return () => {
      queryClient.refetchQueries = originalRefetchQueries;
    };
  }, []);
}