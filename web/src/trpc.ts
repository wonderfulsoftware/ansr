import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../netlify/functions/api/router'
import { auth } from './firebase'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/.netlify/functions/api',
      async headers() {
        const token = auth.currentUser?.getIdToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})

Object.assign(window, { trpc })
