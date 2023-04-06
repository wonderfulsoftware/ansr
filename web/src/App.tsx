import { RouterProvider, createHashRouter } from 'react-router-dom'
import { Room, RoomInfo, RoomLeaderboard, RoomUsers } from './Room'
import { RoomQuestion } from './RoomQuestion'
import { Home } from './Home'
import { Layout } from './Layout'

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

export default App
