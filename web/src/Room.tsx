import { Outlet, useParams, Link, NavLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { trpc } from './trpc'
import { clsx } from 'clsx'
import { Icon } from '@iconify-icon/react'
import {
  QuestionAnswersModel,
  QuestionModel,
  getActiveQuestionIdRef,
  getQuestionAnswersRef,
  getQuestionRef,
  getQuestionsRef,
  getRoomRef,
  getUsersRef,
} from './firebaseDatabase'
import { child, push, serverTimestamp, set, update } from 'firebase/database'
import { Fragment, ReactNode, useCallback, useMemo, useState } from 'react'
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
      {tab('Information', `/rooms/${roomId}`)}
      {tab(
        <>
          Users (<UserCount roomId={roomId} />)
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
    { idField: 'id' },
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
          <div className="form-check form-switch lead mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="acceptingAnswers"
              checked={active}
              onChange={toggle}
            />
            <label className="form-check-label" htmlFor="acceptingAnswers">
              Active &amp; accepting answers
            </label>
          </div>
        )}
      </ActiveQuestionConnector>

      <Question roomId={roomId} questionId={questionId} />
    </div>
  )
}

interface Question {
  roomId: string
  questionId: string
}
function Question(props: Question) {
  const navigate = useNavigate()
  const { roomId, questionId } = props
  const questionRef = getQuestionRef(roomId, questionId)
  const question = useDatabaseObjectData<QuestionModel | null>(questionRef)
  const answersRef = getQuestionAnswersRef(roomId, questionId)
  const answers = useDatabaseListData<QuestionAnswersModel[string]>(
    answersRef,
    { idField: 'id' },
  )
  const [showAnswers, setShowAnswers] = useState(false)
  if (question.status === 'loading') {
    return <div>Loading…</div>
  }
  if (question.status === 'error') {
    return <ErrorAlert error={question.error} />
  }

  const data = question.data!
  const numChoices = data.numChoices || 4
  const numAnswers = answers.data?.length || 0
  return (
    <div className="d-flex flex-column gap-3">
      <FormGroup label="Number of choices" pt0>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <div className="form-check form-check-inline" key={n}>
            <input
              className="form-check-input"
              type="radio"
              id={`choices${n}`}
              value={n}
              checked={n === numChoices}
              onChange={(e) => {
                if (e.target.checked) {
                  update(questionRef, { numChoices: n })
                }
              }}
            />
            <label className="form-check-label" htmlFor={`choices${n}`}>
              {n}
            </label>
          </div>
        ))}
        <FormHint>How many choices are allowed?</FormHint>
      </FormGroup>
      <FormGroup label="Correct choices" pt0>
        <ActiveQuestionConnector roomId={roomId} questionId={questionId}>
          {(active) => (
            <>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                .filter((n) => n <= numChoices)
                .map((n) => (
                  <div className="form-check form-check-inline" key={n}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`correct${n}`}
                      checked={!!data.correctChoices?.[`choice${n}`]}
                      onChange={(e) => {
                        set(
                          child(
                            child(questionRef, 'correctChoices'),
                            `choice${n}`,
                          ),
                          e.target.checked,
                        )
                      }}
                      disabled={active}
                    />
                    <label className="form-check-label" htmlFor={`correct${n}`}>
                      {n}
                    </label>
                  </div>
                ))}
              <FormHint>
                {active ? (
                  <span className="opacity-50">
                    Wait for people to answer first before setting the correct
                    answers.
                  </span>
                ) : (
                  <>Set which answers are correct (for quizzes).</>
                )}
              </FormHint>
            </>
          )}
        </ActiveQuestionConnector>
      </FormGroup>

      <div className="form-check form-switch lead mt-4">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id="showAnswers"
          checked={showAnswers}
          onChange={(e) => setShowAnswers(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="showAnswers">
          Show answers ({numAnswers})
        </label>
      </div>

      <div className="mt-2">
        <div className="card">
          <div className="card-body">
            <AnswerChart
              numChoices={numChoices}
              answers={answers.data || []}
              correctChoices={data.correctChoices}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 d-flex flex-wrap gap-2">
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => {
            if (!confirm('All answers will be deleted.')) return
            set(answersRef, null)
          }}
        >
          <Icon inline icon={'codicon:clear-all'} /> Clear all answers
        </button>
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => {
            if (!confirm('This question will be deleted.')) return
            set(questionRef, null)
            set(answersRef, null)
            navigate(`/rooms/${roomId}`)
          }}
        >
          <Icon inline icon={'bi:trash3'} /> Delete question
        </button>
      </div>
    </div>
  )
}

export interface AnswerChart {
  numChoices: number
  answers: QuestionAnswersModel[string][]
  correctChoices: QuestionModel['correctChoices']
}

export function AnswerChart(props: AnswerChart) {
  const { tally, max } = useMemo(() => {
    const tally: Record<string, number> = {}
    let max = 1
    for (const answer of props.answers) {
      tally[answer.choice] = (tally[answer.choice] || 0) + 1
      max = Math.max(max, tally[answer.choice])
    }
    return { tally, max }
  }, [props.answers, props.numChoices])
  return (
    <div
      className="d-flex gap-3 justify-content-center pt-3"
      style={{ height: '320px' }}
    >
      {Array.from({ length: props.numChoices }, (_, i) => i + 1).map((n) => {
        const count = tally[n] || 0
        const height = (2 + 98 * (count / max)).toFixed(2) + '%'
        const correct = props.correctChoices?.[`choice${n}`]
        return (
          <div
            key={n}
            className="d-flex flex-column text-center"
            style={{ width: '2.5em' }}
          >
            <div className="flex-grow-1 d-flex flex-column justify-content-end">
              <div
                className={clsx(
                  'position-relative rounded',
                  correct ? 'bg-success' : 'bg-primary',
                )}
                style={{ height }}
              >
                <div
                  className="position-absolute top-0 start-0 end-0 text-center"
                  style={{ marginTop: '-1.5em' }}
                >
                  {count}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">{n}</div>
          </div>
        )
      })}
    </div>
  )
}

export interface FormGroup {
  label: ReactNode
  children?: ReactNode
  /** Remove the top padding from the label (required for the label to align with checkbox/radio buttons properly) */
  pt0?: boolean
}
export function FormGroup(props: FormGroup) {
  return (
    <div className="row">
      <strong className={clsx('col-sm-3 col-form-label', props.pt0 && 'pt-0')}>
        {props.label}
      </strong>
      <div className="col-sm-9">{props.children}</div>
    </div>
  )
}

export interface FormHint {
  children?: ReactNode
}
export function FormHint(props: FormHint) {
  return (
    <div className="mt-1">
      <small className="form-text text-muted">{props.children}</small>
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

export interface ErrorAlert {
  error: any
}
export function ErrorAlert(props: ErrorAlert) {
  return <div className="alert alert-danger">{String(props.error)}</div>
}
