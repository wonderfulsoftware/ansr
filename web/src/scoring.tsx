import { QuestionModel } from './firebaseDatabase'
import { AnswerListItem } from './Room'

export function calculateQuestionScore(
  answers: AnswerListItem[],
  question: QuestionModel,
) {
  const scores: Record<string, number> = {}

  // Sort answers by time
  const sortedAnswers = [...answers].sort((a, b) => a.createdAt - b.createdAt)

  // Calculate scores. First person gets 100 points, second gets 99, etc.
  let pointsToAward = 100
  for (const answer of sortedAnswers) {
    const correct = question.correctChoices?.[`choice${answer.choice}`]
    if (correct) {
      scores[answer.userId] = (scores[answer.userId] || 0) + pointsToAward
      pointsToAward = Math.max(0, pointsToAward - 1)
    }
  }
  return scores
}

export function scoresToRankingEntry(scores: Record<string, number>) {
  return Object.entries(scores)
    .map(([userId, score]) => ({
      userId,
      score,
    }))
    .sort((a, b) => b.score - a.score)
}
