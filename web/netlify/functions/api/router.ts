import { TRPCError, initTRPC } from '@trpc/server'
import { z } from 'zod'
import { admin } from '../_shared/firebase'

export const t = initTRPC.create()
export const router = t.router({
  getRoomPin: t.procedure
    .input(
      z.object({
        roomId: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      const { roomId } = input
      const roomRef = admin
        .database()
        .ref(`environments/production/rooms/${roomId}`)

      // Ensure that the room exists
      {
        const snapshot = await roomRef.child('ownerId').once('value')
        if (!snapshot.exists()) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Room not found',
          })
        }
      }

      // Try to get an existing PIN
      const getExistingPin = async () => {
        const snapshot = await roomRef.child('pin').once('value')
        if (!snapshot.exists()) {
          return null
        }
        const pin = snapshot.val()

        // Ensure that the PIN is still pointing to this room
        const pinRef = getPinRef(pin)
        const pinSnapshot = await pinRef.once('value')
        if (pinSnapshot.child('roomId').val() !== roomId) {
          return null
        }

        // Extend the PIN's TTL by 24 hours
        await pinRef.child('expiresAt').set(Date.now() + 24 * 60 * 60 * 1000)

        return {
          pin,
          expiresAt: pinSnapshot.child('expiresAt').val(),
        }
      }

      // Try to allocate a new PIN
      const allocatePin = async (pin: string) => {
        const pinRef = getPinRef(pin)
        const result = await pinRef.transaction((current) => {
          if (current && Date.now() < current.expiresAt) {
            return
          }
          return {
            roomId,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          }
        })
        if (result.snapshot.child('roomId').val() !== roomId) {
          return null
        }
        await roomRef.child('pin').set(pin)
        return {
          pin,
          expiresAt: result.snapshot.child('expiresAt').val(),
        }
      }
      const allocateNewPin = async () => {
        for (let length = 5; length < 10; length++) {
          const pin = Array.from(
            { length },
            () => Math.floor(Math.random() * 9) + 1,
          ).join('')
          const allocated = await allocatePin(pin)
          if (allocated) {
            return allocated
          }
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to allocate PIN',
        })
      }

      const pin = (await getExistingPin()) || (await allocateNewPin())
      return pin as {
        pin: string
        expiresAt: number
      }
    }),
})

export type AppRouter = typeof router

function getPinRef(pin: any) {
  return admin.database().ref(`environments/production/pins/${pin}`)
}
