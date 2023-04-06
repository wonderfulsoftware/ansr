import { Icon } from '@iconify-icon/react'
import { useUser } from 'reactfire'
import { db } from './firebase'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { push, ref, serverTimestamp, set } from 'firebase/database'
import { getRoomsRef } from './firebaseDatabase'

export function Home() {
  return (
    <>
      <div className="container">
        <p className="lead">Create live quizzes with ease.</p>
        <HomeCta />
      </div>
    </>
  )
}
function HomeCta() {
  const { status, data: user } = useUser()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('User is not logged in.')
      }
      const room = await push(getRoomsRef(), {
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      })
      navigate(`/rooms/${room.key}`)
      set(
        ref(db, `environments/production/users/${user.uid}/rooms/${room.key}`),
        { createdAt: serverTimestamp() },
      )
    },
    onError: (error) => {
      console.error(error)
      alert(`Unable to create a new room: ${error}`)
    },
  })

  if (status !== 'success') {
    return <></>
  }

  return (
    <>
      {user ? (
        <p>
          <button
            className="btn btn-primary btn-lg"
            disabled={mutation.isLoading}
            onClick={() => mutation.mutate()}
          >
            {mutation.isLoading ? (
              <>Please wait…</>
            ) : (
              <>
                <Icon inline icon="bi:plus-circle" /> Create a new room
              </>
            )}
          </button>
        </p>
      ) : (
        <p>
          <a
            href="/.netlify/functions/line-login"
            className="btn btn-outline-light"
          >
            <Icon inline icon="simple-icons:line" /> Login with LINE
          </a>
        </p>
      )}
    </>
  )
}
