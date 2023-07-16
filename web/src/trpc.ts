import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../backend/src/appRouter'
import { auth } from './firebase'
import { isQueryFlagEnabled } from './queryFlags'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url:
        location.hostname === 'localhost'
          ? 'http://localhost:5001/demo-ansr/asia-southeast1/trpc'
          : '/trpc',
      async headers() {
        const token = auth.currentUser?.getIdToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})

Object.assign(window, { trpc })
