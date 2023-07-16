import { RouterProvider, createHashRouter } from 'react-router-dom'
import { Room, RoomInfo, RoomLeaderboard, RoomUsers } from './Room'
import { RoomQuestion } from './RoomQuestion'
import { Home } from './Home'
import { Layout } from './Layout'
import { AuthCallback, AuthLogIn } from './Auth'

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/auth/login',
        element: <AuthLogIn />,
      },
      {
        path: '/auth/callback',
        element: <AuthCallback />,
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
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
