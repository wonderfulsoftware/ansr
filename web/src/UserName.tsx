import { UserModel, getUserRef } from './firebaseDatabase'
import { useDatabaseObjectData } from './nanofire'

export interface UserName {
  roomId: string
  userId: string
}
export function UserName(props: UserName) {
  const userRef = getUserRef(props.roomId, props.userId)
  const { data } = useDatabaseObjectData<UserModel>(userRef)
  return <>{data?.displayName || props.userId}</>
}
