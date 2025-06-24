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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      // Handle auth errors silently
      if (res.status === 401) {
        return null;
      }

      if (!res.ok) {
        // Silently return null for other client errors to prevent crashes
        if (res.status >= 400 && res.status < 500) {
          return null;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      // Always return null for network/auth errors to prevent crashes
      if (error instanceof TypeError || (error instanceof Error && error.message.includes("fetch"))) {
        return null;
      }
      return null;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors or client errors
        if (error.message.includes("Unauthorized") || error.message.includes("HTTP 4")) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
