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

// Completely safe query function that never throws or rejects
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  return new Promise(async (resolve) => {
    try {
      const url = Array.isArray(queryKey) ? queryKey[0] : queryKey;
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
  });
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: false, // Never retry to prevent error loops
    },
    mutations: {
      retry: false,
    },
  },
});
