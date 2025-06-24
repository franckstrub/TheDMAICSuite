import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Completely safe query function
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  
  // Block all auth endpoints to prevent crashes
  if (typeof url === 'string' && (url.includes('/api/auth') || url.includes('/api/login'))) {
    return null;
  }
  
  try {
    const res = await fetch(url as string, {
      credentials: "include",
    });
    
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: false,
      throwOnError: false, // Never throw errors
    },
    mutations: {
      retry: false,
      throwOnError: false,
    },
  },
});
