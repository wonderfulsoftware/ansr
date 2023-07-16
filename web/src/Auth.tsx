import { trpc } from './trpc'
import { useMutation, useQuery } from '@tanstack/react-query'
import { signInWithCustomToken } from 'firebase/auth'
import { useEffect, useRef } from 'react'
import { auth } from './firebase'
import { isQueryFlagEnabled } from './queryFlags'
import { useNavigate } from 'react-router-dom'

function getOrigin() {
  return isQueryFlagEnabled('test')
    ? location.origin + '?flags=test'
    : location.origin
}

export function AuthLogIn() {
  const { data } = useQuery({
    queryKey: ['authorizeUrl'],
    queryFn: async () => {
      return trpc.auth.getAuthorizeUrl.query({
        origin: getOrigin(),
      })
    },
    useErrorBoundary: true,
  })
  const url = data?.authorizeUrl
  useEffect(() => {
    if (url) {
      location.replace(url)
    }
  }, [url])
  return (
    <div className="container">
      <p>{url ? 'Redirecting…' : 'Please wait…'}</p>
      {!!url && (
        <p>
          Click <a href={url}>here</a> if you are not redirected.
        </p>
      )}
    </div>
  )
}

export function AuthCallback() {
  type CallbackResult = { success: true } | { success: false; reason: string }
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['callbackResult'],
    queryFn: async (): Promise<CallbackResult> => {
      const params = new URLSearchParams(location.search)
      const code = params.get('code')
      const state = params.get('state')
      if (!code) {
        return { success: false, reason: 'No code' }
      }
      if (!state) {
        return { success: false, reason: 'No state' }
      }
      const result = await trpc.auth.handleCallback.mutate({
        code,
        origin: getOrigin(),
      })
      console.log('result', result)
      await signInWithCustomToken(auth, result.customToken)
      const nextUrl = new URL(location.href)
      nextUrl.searchParams.delete('code')
      nextUrl.searchParams.delete('state')
      history.replaceState(null, '', nextUrl.toString())
      navigate('/', { replace: true })
      return { success: true }
    },
    useErrorBoundary: true,
  })
  return (
    <div className="container">
      <p>
        {query.status === 'loading'
          ? 'Please wait…'
          : query.data?.success
          ? 'You are now logged in. Please wait…'
          : query.data?.reason ||
            (!!query.error && String(query.error)) ||
            'Something went wrong.'}
      </p>
    </div>
  )
}
