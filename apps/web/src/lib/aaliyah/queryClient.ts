import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000, // 30 seconds
            gcTime: 5 * 60 * 1000, // 5 minutes (React Query v5 uses gcTime instead of cacheTime)
            refetchOnWindowFocus: true,
            retry: 2,
        },
    },
})
