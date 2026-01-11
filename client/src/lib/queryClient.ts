import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { authenticatedFetch, getAccessToken } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { error: text || res.statusText };
    }
    
    // Create an error object with additional properties
    const error: any = new Error(errorData.message || errorData.error || `${res.status}: ${res.statusText}`);
    // Attach additional error data for savings contributions
    if (errorData.isSavingsContribution) {
      error.isSavingsContribution = true;
      error.savingsGoalName = errorData.savingsGoalName;
      error.savingsContributionId = errorData.savingsContributionId;
    }
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAccessToken();
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = token 
    ? await authenticatedFetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      })
    : await fetch(url, {
        method,
        headers,
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
    const token = getAccessToken();
    
    const res = token
      ? await authenticatedFetch(queryKey.join("/") as string, {})
      : await fetch(queryKey.join("/") as string, {
          credentials: "include",
        });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
