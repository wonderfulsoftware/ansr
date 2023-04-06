import { Outlet, useParams, Link, NavLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { trpc } from './trpc'
import { clsx } from 'clsx'
import { Icon } from '@iconify-icon/react'
import {
  RoomModel,
  getQuestionsRef,
  getRoomRef,
  getUsersRef,
} from './firebaseDatabase'
import { push, serverTimestamp } from 'firebase/database'
import { Fragment, ReactNode, useMemo } from 'react'
import {
  useDatabaseListData,
  useDatabaseObject,
  useDatabaseObjectData,
} from 'reactfire'
import { UserName } from './UserName'
import { calculateQuestionScore, scoresToRankingEntry } from './scoring'
import { AnswerListItem } from './RoomQuestion'
import { QuestionList } from './QuestionList'

export function Room() {
  const params = useParams()
  const roomId = params.roomId!
  const pin = useRoomPin(roomId)
  return (
    <>
      <div className="container">
        <RoomNav roomId={roomId} pin={pin || '…'} />
        <Outlet />
        <RoomDataSubscriber roomId={roomId} />
      </div>
    </>
  )
}

interface RoomDataSubscriber {
  roomId: string
}
function RoomDataSubscriber(props: RoomDataSubscriber) {
  useDatabaseObject(getRoomRef(props.roomId))
  return <></>
}

function useRoomPin(roomId: string) {
  const pin = useQuery({
    queryKey: ['pin'],
    queryFn: async () => {
      return await trpc.getRoomPin.query({ roomId: roomId })
    },
  }).data?.pin
  return pin ? `R${pin}` : undefined
}

export interface RoomNav {
  roomId: string
  pin: string
}
export function RoomNav(props: RoomNav) {
  const { roomId } = props
  const navigate = useNavigate()
  const newQuestion = useMutation({
    mutationFn: async () => {
      const questionsRef = getQuestionsRef(roomId)
      const question = await push(questionsRef, {
        createdAt: serverTimestamp(),
      })
      const key = question.key!
      navigate(`/rooms/${roomId}/questions/${key}`)
    },
    onError: (err) => {
      alert(`Unable to create question: ${err}`)
    },
  })
  const tab = (name: ReactNode, path: string) => (
    <li className="nav-item">
      <NavLink
        to={path}
        end
        className={({ isActive, isPending }) =>
          clsx('nav-link', isActive && 'active', isPending && 'disabled')
        }
      >
        {name}
      </NavLink>
    </li>
  )
  return (
    <ul className="nav nav-pills">
      <li className="nav-item">
        <a className="nav-link disabled">
          <strong>Room {props.pin}</strong>
        </a>
      </li>
      {tab(
        <>
          <Icon inline icon="bi:info-circle" /> Information
        </>,
        `/rooms/${roomId}`,
      )}
      {tab(
        <>
          <Icon inline icon="bi:people" /> Users (<UserCount roomId={roomId} />)
        </>,
        `/rooms/${roomId}/users`,
      )}
      <QuestionList roomId={roomId}>
        {(ids) =>
          ids.map((id, index) => (
            <Fragment key={id}>
              {tab(`#${index + 1}`, `/rooms/${roomId}/questions/${id}`)}
            </Fragment>
          ))
        }
      </QuestionList>
      <li className="nav-item">
        <button
          className="nav-link"
          disabled={newQuestion.isLoading}
          onClick={() => newQuestion.mutate()}
          aria-label="Create new question"
        >
          <Icon inline icon="bi:plus" /> Question
        </button>
      </li>
      {tab(
        <>
          <Icon inline icon="bi:list-ol" /> Leaderboard
        </>,
        `/rooms/${roomId}/leaderboard`,
      )}
    </ul>
  )
}

function generateQrCode(payload: string) {
  return `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(
    payload,
  )}`
}

export function RoomInfo() {
  const params = useParams()
  const roomId = params.roomId!
  const pin = useRoomPin(roomId)
  const lineId = '@ansr'
  const messageUrl = pin
    ? `https://line.me/R/oaMessage/${lineId}/?${pin}`
    : null
  return (
    <div className="p-3">
      <h1>Join this room</h1>

      {messageUrl ? (
        <div className="d-flex flex-wrap align-items-center gap-5">
          <div>
            <img
              src={generateQrCode(messageUrl)}
              alt="QR code to join this room"
              width="300"
              height="300"
            />
          </div>
          <div>
            <div className="fs-2">LINE ID</div>
            <div className="fs-1 mb-4">
              <code className="text-white" style={{ fontSize: '1.5em' }}>
                {lineId}
              </code>
            </div>
            <div className="fs-2">Room PIN</div>
            <div className="fs-1">
              <code
                className="text-white"
                style={{ fontSize: '1.5em' }}
                data-testid="Room PIN"
              >
                {pin}
              </code>
            </div>
          </div>
        </div>
      ) : (
        '…'
      )}

      <RoomInspector roomId={roomId} />
    </div>
  )
}

export interface RoomInspector {
  roomId: string
}

export function RoomInspector(props: RoomInspector) {
  const { roomId } = props
  const roomRef = getRoomRef(roomId)
  const room = useDatabaseObjectData(roomRef)
  return (
    <>
      <details className="mt-5">
        <summary className="text-muted">Debug info</summary>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          <code>{JSON.stringify(room.data, null, 2)}</code>
        </pre>
      </details>
    </>
  )
}

export interface UserCount {
  roomId: string
}
export function UserCount(props: UserCount) {
  const users = useRoomUsers(props.roomId)
  return <>{users.length}</>
}

export function RoomUsers() {
  const params = useParams()
  const roomId = params.roomId!
  const users = useRoomUsers(roomId)
  return (
    <div className="p-3">
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id} data-id={user.id}>
            {user.displayName}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RoomLeaderboard() {
  const params = useParams()
  const roomId = params.roomId!
  const roomData = useDatabaseObjectData<RoomModel>(getRoomRef(roomId))
  const data = roomData.data
  const result = useMemo(() => {
    if (!data) return []
    const scores: Record<string, number> = {}
    for (const [questionId, question] of Object.entries(
      roomData.data.questions || {},
    )) {
      const answers = Object.entries(data.answers?.[questionId] || {}).map(
        ([userId, answer]): AnswerListItem => {
          return { userId, ...answer }
        },
      )
      const questionScore = calculateQuestionScore(answers, question)
      for (const [userId, score] of Object.entries(questionScore)) {
        scores[userId] = (scores[userId] || 0) + score
      }
    }
    return scoresToRankingEntry(scores)
  }, [data])
  return (
    <div className="p-3">
      <h1 className="text-center">Leaderboard</h1>
      <div className="d-flex justify-content-center">
        <table className="table table-bordered w-auto">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {result.map((entry, index) => (
              <tr key={entry.userId}>
                <td>{index + 1}</td>
                <td>
                  <UserName roomId={roomId} userId={entry.userId} />
                </td>
                <td align="right">{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function useRoomUsers(roomId: string) {
  const usersRef = getUsersRef(roomId)
  const users = useDatabaseListData<{ id: string; displayName: string }>(
    usersRef,
    { idField: 'id' },
  )
  return users.data || []
}
