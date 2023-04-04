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
  const time = Date.now()
  const { userId, text } = input
  const userState: UserState =
    (await db.get(`users/${userId}/state.json?auth=${dbSecret}`).json()) || {}
  return userState.currentRoomId
    ? handleInRoom(userState.currentRoomId)
    : handleNotInRoom()

  async function handleInRoom(roomId: string) {
    // Enter a room PIN to join another room
    {
      const m = text.match(/^R(\d{5,9})$/i)
      if (m) {
        return handleJoinRoom(m[1], true)
      }
    }

    const activeQuestionId = (await db
      .get(`rooms/${roomId}/activeQuestionId.json?auth=${dbSecret}`)
      .json()) as string | null
    if (!activeQuestionId) {
      return `no active question right now`
    }

    const myAnswer = (await db
      .get(
        `rooms/${roomId}/answers/${activeQuestionId}/${userId}.json?auth=${dbSecret}`,
      )
      .json()) as { choice: number } | null
    if (myAnswer) {
      return `you have already answered this question (your answer: ${myAnswer.choice})`
    }

    const activeQuestion = (await db
      .get(
        `rooms/${roomId}/questions/${activeQuestionId}.json?auth=${dbSecret}`,
      )
      .json()) as { numChoices?: number } | null
    if (!activeQuestion) {
      return `no active question right now...`
    }

    const numChoices = activeQuestion.numChoices || 4
    const choice = parseInt(text, 10)
    if (choice < 1 || choice > numChoices) {
      const acceptedChoices = Array.from({ length: numChoices }).map(
        (_, i) => i + 1,
      )
      return `invalid choice (accepted: ${acceptedChoices.join(', ')})`
    }

    await db.put(
      `rooms/${roomId}/answers/${activeQuestionId}/${userId}.json?auth=${dbSecret}`,
      { json: { choice, createdAt: time } },
    )
    return `your answer (${choice}) has been recorded`
  }
  async function handleNotInRoom() {
    // Enter a room PIN to join a room
    {
      const m = text.match(/^R(\d{5,9})$/i)
      if (m) {
        return handleJoinRoom(m[1])
      }
    }

    return 'you are not currently in a room\nenter a room PIN to join a room'
  }
  async function handleJoinRoom(pin: string, switching = false) {
    // Resolve the PIN to a room ID
    const pinInfo = (await db
      .get(`pins/${pin}.json?auth=${dbSecret}`)
      .json()) as { roomId?: string; expiresAt: number } | null
    if (!pinInfo?.roomId) {
      return `room with PIN R${pin} not found`
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

    return switching
      ? 'switched to a new room successfully! welcome!'
      : 'joined room successfully! welcome!'
  }
}

interface UserState {
  currentRoomId?: string
}
