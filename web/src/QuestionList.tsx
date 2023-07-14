import { getQuestionsRef } from './firebaseDatabase'
import { ReactNode } from 'react'
import { useDatabaseListData } from './nanofire'

export interface QuestionList {
  roomId: string
  children?: (ids: string[]) => ReactNode
}
export function QuestionList(props: QuestionList) {
  const query = useDatabaseListData<{ id: string }>(
    getQuestionsRef(props.roomId),
    { idField: 'id' },
  )
  return <>{props.children?.(query.data?.map((q) => q.id) || [])}</>
}
