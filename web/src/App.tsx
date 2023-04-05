import { ReactNode } from 'react'
import { Icon } from '@iconify-icon/react'
import { useUser } from 'reactfire'
import { signOut } from 'firebase/auth'
import { auth, db } from './firebase'
import { RouterProvider, createHashRouter, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { push, ref, serverTimestamp, set } from 'firebase/database'
import {
  Room,
  RoomInfo,
  RoomLeaderboard,
  RoomQuestion,
  RoomUsers,
} from './Room'
import { getRoomsRef } from './firebaseDatabase'

const router = createHashRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/rooms/:roomId',
    element: <Room />,
    children: [
      { index: true, element: <RoomInfo /> },
      { path: 'users', element: <RoomUsers /> },
      { path: 'questions/:questionId', element: <RoomQuestion /> },
      { path: 'leaderboard', element: <RoomLeaderboard /> },
    ],
  },
])

function App() {
  return (
    <Layout>
      <RouterProvider router={router} />
    </Layout>
  )
}

function Home() {
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

export interface Layout {
  children?: ReactNode
}

export function Layout(props: Layout) {
  return (
    <>
      <header className="p-3 text-bg-dark">
        <div className="container">
          <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
            <span className="d-flex align-items-center mb-2 mb-lg-0 text-white text-decoration-none">
              <span className="fs-4">ansr</span>
            </span>

            <div className="ms-auto text-end d-flex gap-2">
              <AuthBar />
            </div>
          </div>
        </div>
      </header>
      {props.children}
    </>
  )
}
export function AuthBar() {
  const { status, data: user } = useUser()

  if (status !== 'success') {
    return <></>
  }

  if (!user) {
    return (
      <button
        type="button"
        className="btn btn-outline-light me-2"
        onClick={() => location.replace('/.netlify/functions/line-login')}
      >
        <Icon inline icon="simple-icons:line" /> Login
      </button>
    )
  }

  return (
    <button
      type="button"
      className="btn btn-outline-secondary me-2"
      onClick={() => signOut(auth)}
    >
      Log out ({user.displayName})
    </button>
  )
}

export default App
