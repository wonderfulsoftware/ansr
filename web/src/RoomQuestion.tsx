import { useParams, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { Icon } from '@iconify-icon/react'
import {
  QuestionAnswersModel,
  QuestionModel,
  getActiveQuestionIdRef,
  getQuestionAnswersRef,
  getQuestionRef,
} from './firebaseDatabase'
import { child, set, update } from 'firebase/database'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { useDatabaseListData, useDatabaseObjectData } from './nanofire'
import { ErrorAlert } from './ErrorAlert'
import { UserName } from './UserName'
import { FormGroup, FormHint } from './ui'
import { calculateQuestionScore, scoresToRankingEntry } from './scoring'
import { QuestionList } from './QuestionList'

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

export type AnswerListItem = QuestionAnswersModel[string] & { userId: string }
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
  const answers = useDatabaseListData<AnswerListItem>(answersRef, {
    idField: 'userId',
  })
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

      <div
        className="mt-2"
        style={{ transition: '0.25s opacity', opacity: showAnswers ? 1 : 0 }}
      >
        <div className="card">
          <div className="card-body">
            <AnswerChart
              numChoices={numChoices}
              answers={answers.data || []}
              correctChoices={data.correctChoices}
            />
            <div className="mt-3 d-flex justify-content-center">
              <RoundScoreTable
                answers={answers.data || []}
                question={data}
                roomId={roomId}
              />
            </div>
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
  answers: AnswerListItem[]
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
        const label =
          count === 0
            ? `No one answered ${n}`
            : count === 1
            ? `1 person answered ${n}`
            : `${count} people answered ${n}`
        return (
          <div
            key={n}
            className="d-flex flex-column text-center"
            style={{ width: '2.5em' }}
            data-testid="Answer chart bar"
            aria-label={label}
          >
            <div className="flex-grow-1 d-flex flex-column justify-content-end">
              <div
                className={clsx(
                  'position-relative rounded',
                  correct ? 'bg-success' : 'bg-primary',
                )}
                style={{ height, transition: '0.5s height ease-out' }}
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

export interface RoundScoreTable {
  roomId: string
  answers: AnswerListItem[]
  question: QuestionModel
}

export function RoundScoreTable(props: RoundScoreTable) {
  const { answers, question } = props
  const entries = useMemo(() => {
    const scores: Record<string, number> = calculateQuestionScore(
      answers,
      question,
    )
    const entries = scoresToRankingEntry(scores)
    return entries
  }, [answers, question])
  return (
    <table className="table table-bordered w-auto">
      <thead>
        <tr>
          <th>Name</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, i) => (
          <tr key={entry.userId}>
            <td>
              <UserName roomId={props.roomId} userId={entry.userId} />
            </td>
            <td align="right">+{entry.score}</td>
          </tr>
        ))}
        {entries.length === 0 && (
          <tr>
            <td colSpan={2}>No correct answer submission</td>
          </tr>
        )}
      </tbody>
    </table>
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
