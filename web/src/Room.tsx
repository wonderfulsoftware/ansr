import { Outlet, useParams, Link, NavLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { trpc } from './trpc'
import { clsx } from 'clsx'
import { Icon } from '@iconify-icon/react'
import {
  getActiveQuestionIdRef,
  getQuestionsRef,
  getRoomRef,
  getUsersRef,
} from './firebaseDatabase'
import { push, serverTimestamp, set } from 'firebase/database'
import { Fragment, ReactNode, useCallback } from 'react'
import {
  useDatabaseListData,
  useDatabaseObject,
  useDatabaseObjectData,
} from 'reactfire'

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
  return useQuery({
    queryKey: ['pin'],
    queryFn: async () => {
      return await trpc.getRoomPin.query({ roomId: roomId })
    },
  }).data?.pin
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
      <li className="nav-item">{tab('Information', `/rooms/${roomId}`)}</li>
      <li className="nav-item">
        {tab(
          <>
            Users (<UserCount roomId={roomId} />)
          </>,
          `/rooms/${roomId}/users`,
        )}
      </li>
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
        >
          <Icon inline icon="bi:plus" /> Question
        </button>
      </li>
    </ul>
  )
}

interface QuestionList {
  roomId: string
  children?: (ids: string[]) => ReactNode
}
function QuestionList(props: QuestionList) {
  const query = useDatabaseListData<{ id: string }>(
    getQuestionsRef(props.roomId),
    { idField: 'id' },
  )
  return <>{props.children?.(query.data?.map((q) => q.id) || [])}</>
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
  const lineId = '@419fosji'
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
              <code className="text-white" style={{ fontSize: '1.5em' }}>
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

function useRoomUsers(roomId: string) {
  const usersRef = getUsersRef(roomId)
  const users = useDatabaseListData<{ id: string; displayName: string }>(
    usersRef,
    {
      idField: 'id',
    },
  )
  return users.data || []
}

export function RoomQuestion() {
  const params = useParams()
  const roomId = params.roomId!
  const questionId = params.questionId!
  const questionIndex = (
    <QuestionList roomId={roomId}>
      {(ids) => ids.indexOf(questionId) + 1}
    </QuestionList>
  )
  return (
    <div className="p-3">
      <h1>
        Question #{questionIndex}
        <small>
          &nbsp;{' '}
          <ActiveQuestionConnector roomId={roomId} questionId={questionId}>
            {(active) =>
              active ? (
                <span className="badge rounded-pill text-bg-success">
                  Active
                </span>
              ) : (
                <span className="badge rounded-pill text-bg-danger">
                  Inactive
                </span>
              )
            }
          </ActiveQuestionConnector>
        </small>
      </h1>
      <ActiveQuestionConnector roomId={roomId} questionId={questionId}>
        {(active, toggle) => (
          <div className="form-check form-switch lead">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="acceptingAnswers"
              checked={active}
              onChange={toggle}
            />
            <label className="form-check-label" htmlFor="acceptingAnswers">
              Accepting answers
            </label>
          </div>
        )}
      </ActiveQuestionConnector>
    </div>
  )
}

export interface FormGroup {
  label: ReactNode
  children?: ReactNode
}
export function FormGroup(props: FormGroup) {
  return (
    <div className="row">
      <strong className="col-sm-2 col-form-label">{props.label}</strong>
      <div className="col-sm-10">{props.children}</div>
    </div>
  )
}

export interface ActiveQuestionConnector {
  roomId: string
  questionId: string
  children: (active: boolean, toggle: () => void) => ReactNode
}
export function ActiveQuestionConnector(props: ActiveQuestionConnector) {
  const { roomId, questionId, children } = props
  const activeQuestionRef = getActiveQuestionIdRef(roomId)
  const activeQuestion = useDatabaseObjectData<string | null>(
    activeQuestionRef,
  ).data
  const toggle = useCallback(() => {
    if (activeQuestion === questionId) {
      set(activeQuestionRef, null)
    } else {
      set(activeQuestionRef, questionId)
    }
  }, [activeQuestion, activeQuestionRef, questionId])
  return <>{children(activeQuestion === questionId, toggle)}</>
}
