import { Icon } from '@iconify-icon/react'
import { useUser } from 'reactfire'
import { useDatabaseListData, useDatabaseObjectData } from './nanofire'
import { db } from './firebase'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  child,
  limitToLast,
  orderByKey,
  push,
  query,
  ref,
  serverTimestamp,
  set,
} from 'firebase/database'
import { getRoomRef, getRoomsRef } from './firebaseDatabase'
import { UserCount } from './Room'

export function Home() {
  return (
    <>
      <div className="container">
        <p className="lead">Create live quizzes with ease.</p>
        <div className="d-flex flex-column gap-4">
          <HomeCta />
          <RecentRoomList />
        </div>
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

function RecentRoomList() {
  const { status, data: user } = useUser()
  if (!user) return <></>
  return <RecentRooms userId={user.uid} />
}

interface RecentRooms {
  userId: string
}

function RecentRooms(props: RecentRooms) {
  const list = useDatabaseListData<{ id: string; createdAt: number }>(
    query(
      ref(db, `environments/production/users/${props.userId}/rooms`),
      orderByKey(),
      limitToLast(10),
    ),
    { idField: 'id' },
  )
  if (!list.data) return <></>
  return (
    <section>
      <h2>Recent rooms</h2>
      <table className="table table-bordered w-auto">
        <thead>
          <tr>
            <th>Created</th>
            <th>Users</th>
            <th>PIN</th>
          </tr>
        </thead>
        <tbody>
          {list.data
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((room) => (
              <tr key={room.id}>
                <td>
                  <Link to={`/rooms/${room.id}`}>
                    {new Date(room.createdAt).toLocaleString()}
                  </Link>
                </td>
                <td align="right">
                  <UserCount roomId={room.id} />
                </td>
                <td>
                  <RoomPinInspector roomId={room.id} />
                </td>
              </tr>
            ))}
          {!list.data.length && (
            <tr>
              <td colSpan={3}>No recent rooms.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

export interface RoomPinInspector {
  roomId: string
}
export function RoomPinInspector(props: RoomPinInspector) {
  const data = useDatabaseObjectData<string>(
    child(getRoomRef(props.roomId), 'pin'),
  )
  return <>{data.data ? `R${data.data}` : '(no pin)'}</>
}
