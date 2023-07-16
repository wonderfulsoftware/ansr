import { TRPCError, initTRPC } from '@trpc/server'
import { z } from 'zod'
import axios from 'axios'
import { admin } from './admin'
import { env } from './env'
import { handleAxiosError } from './handleAxiosError'
import * as logger from 'firebase-functions/logger'
import { handle } from './logic'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Context {}

const t = initTRPC.context<Context>().create()

export const appRouter = t.router({
  info: t.procedure.query(async () => {
    return { name: 'ansr' }
  }),
  auth: t.router({
    getAuthorizeUrl: t.procedure
      .input(
        z.object({
          origin: z.string(),
        }),
      )
      .query(async ({ input }) => {
        const redirectUri = getRedirectUri(input)

        // Redirect to LINE Login
        const authorizeUrl = `https://access.line.me/oauth2/v2.1/authorize?${new URLSearchParams(
          {
            response_type: 'code',
            client_id: env.LINE_LOGIN_CLIENT_ID,
            redirect_uri: redirectUri,
            scope: 'profile',
            state: '-',
          },
        )}`
        return { authorizeUrl }
      }),
    handleCallback: t.procedure
      .input(
        z.object({
          code: z.string(),
          origin: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        // Exchange code for access token
        const accessToken = (
          await axios
            .post(
              'https://api.line.me/oauth2/v2.1/token',
              new URLSearchParams({
                grant_type: 'authorization_code',
                code: input.code,
                redirect_uri: getRedirectUri(input),
                client_id: env.LINE_LOGIN_CLIENT_ID,
                client_secret: env.LINE_LOGIN_CLIENT_SECRET,
              }),
            )
            .catch(handleAxiosError('Unable to exchange code for access token'))
        ).data.access_token

        const profile = (
          await axios
            .get('https://api.line.me/v2/profile', {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            })
            .catch(handleAxiosError('Unable to get profile'))
        ).data

        const uid = profile.userId
        const displayName = profile.displayName
        const photoURL = profile.pictureUrl

        // Try to create a user
        return await handleProfile(uid, displayName, photoURL)
      }),
  }),
  rooms: t.router({
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
          for (let length = 6; length < 10; length++) {
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
  }),
  testing: t.router({
    injectMessage: t.procedure
      .input(
        z.object({
          uid: z.string().regex(/^tester_(\S+)$/i),
          message: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This endpoint is only available in development mode',
          })
        }

        const { uid, message } = input
        if (!uid || !message) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Missing uid or message',
          })
        }

        const result = await handle(
          {
            userId: uid,
            text: message,
            time: Date.now(),
          },
          { resolveDisplayName: async (userId) => 'Test user - ' + userId },
        )
        logger.info(
          `uid: ${uid}, message: ${JSON.stringify(
            message,
          )}, result: ${JSON.stringify(result)}`,
        )
      }),
  }),
})

export type AppRouter = typeof appRouter

function getRedirectUri(input: { origin: string }) {
  return new URL('#/auth/callback', input.origin).toString()
}

async function handleProfile(
  uid: string,
  displayName: string,
  photoURL: string,
) {
  try {
    await admin.auth().createUser({ uid, displayName, photoURL })
  } catch (e: any) {
    // Update the user if it already exists
    if (e.code === 'auth/uid-already-exists') {
      await admin.auth().updateUser(uid, { displayName, photoURL })
    } else {
      throw e
    }
  }

  // Create a custom token
  const customToken = await admin.auth().createCustomToken(uid)
  return { customToken }
}

function getPinRef(pin: string) {
  return admin.database().ref(`environments/production/pins/${pin}`)
}
