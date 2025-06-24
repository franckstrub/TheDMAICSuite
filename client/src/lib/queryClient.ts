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

// Ultra-safe query function that never fails
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  return new Promise((resolve) => {
    const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    
    // Use setTimeout to ensure async execution and prevent blocking
    setTimeout(async () => {
      try {
        const res = await fetch(url as string, {
          credentials: "include",
        });

        if (!res.ok) {
          resolve(null);
          return;
        }

        const data = await res.json();
        resolve(data);
      } catch {
        resolve(null);
      }
    }, 0);
  });
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
