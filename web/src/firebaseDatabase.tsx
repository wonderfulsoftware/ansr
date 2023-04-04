import { db } from './firebase'
import { child, ref } from 'firebase/database'

export function getRoomsRef() {
  return ref(db, 'environments/production/rooms')
}

export function getRoomRef(roomId: string) {
  return child(getRoomsRef(), roomId)
}

export function getUsersRef(roomId: string) {
  return child(getRoomRef(roomId), 'users')
}

export function getQuestionsRef(roomId: string) {
  return child(getRoomRef(roomId), 'questions')
}

export function getActiveQuestionIdRef(roomId: string) {
  return child(getRoomRef(roomId), 'activeQuestionId')
}

export function getQuestionRef(roomId: string, questionId: string) {
  return child(getQuestionsRef(roomId), questionId)
}

export function getQuestionAnswersRef(roomId: string, questionId: string) {
  return child(getRoomRef(roomId), `answers/${questionId}`)
}

export interface QuestionModel {
  createdAt: number
  numChoices?: number
  correctChoices?: Record<string, boolean>
}

export interface QuestionAnswersModel {
  [userId: string]: {
    choice: number
    createdAt: number
  }
}

export interface RoomModel {
  questions?: {
    [questionId: string]: QuestionModel
  }
  answers?: {
    [questionId: string]: QuestionAnswersModel
  }
}
