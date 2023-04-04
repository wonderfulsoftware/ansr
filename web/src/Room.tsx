import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { trpc } from './trpc'

export function Room() {
  const params = useParams()
  const pinQuery = useQuery({
    queryKey: ['pin'],
    queryFn: async () => {
      return await trpc.getRoomPin.query({ roomId: params.roomId! })
    },
  })
  return (
    <>
      <div className="container">
        <h1>Room PIN: {pinQuery.data?.pin || '…'}</h1>
      </div>
    </>
  )
}
