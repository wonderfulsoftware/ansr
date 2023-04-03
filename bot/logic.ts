import ky from 'https://esm.sh/ky@0.33.3'

const dbSecret = Deno.env.get('FIREBASE_DB_SECRET')!
const dbUrl =
  'https://answerbuzzer-default-rtdb.asia-southeast1.firebasedatabase.app/environments/production'
const db = ky.extend({
  prefixUrl: dbUrl,
})

export interface HandleContext {
  resolveDisplayName(userId: string): Promise<string>
}

export async function handle(
  input: { userId: string; text: string },
  context: HandleContext,
) {
  const { userId, text } = input
  const userState: UserState =
    (await db.get(`users/${userId}/state.json?auth=${dbSecret}`).json()) || {}
  return userState.currentRoomId ? handleInRoom() : handleNotInRoom()

  async function handleInRoom() {
    return 'you are already in a room'
  }
  async function handleNotInRoom() {
    // Enter a room PIN to join a room
    {
      const m = text.match(/^(\d{5,9})$/)
      if (m) {
        return handleJoinRoom(m[1])
      }
    }

    return 'you are not in a aroom'
  }
  async function handleJoinRoom(pin: string) {
    // Resolve the PIN to a room ID
    const pinInfo = (await db
      .get(`pins/${pin}.json?auth=${dbSecret}`)
      .json()) as { roomId?: string; expiresAt: number } | null
    if (!pinInfo?.roomId) {
      return `room with PIN ${pin} not found`
    }
    if (Date.now() > pinInfo.expiresAt) {
      return `room is not active`
    }

    const roomId = pinInfo.roomId

    // Check if the room is open for joining
    const isOpen = (await db
      .get(`rooms/${roomId}/open.json?auth=${dbSecret}`)
      .json()) as boolean | null
    if (!isOpen) {
      return `room is not open for joining, sorry`
    }

    // Add the user info to the room
    const displayName = await context.resolveDisplayName(userId)
    await db.put(
      `rooms/${roomId}/users/${userId}/displayName.json?auth=${dbSecret}`,
      { json: displayName },
    )

    // Update the user state
    await db.put(`users/${userId}/state/currentRoomId.json?auth=${dbSecret}`, {
      json: roomId,
    })

    return 'joined room successfully! welcome!'
  }
}

interface UserState {
  currentRoomId?: string
}
