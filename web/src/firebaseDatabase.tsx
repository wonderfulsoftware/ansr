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
