import ky from 'https://esm.sh/ky@0.33.3'

const dbClient = (() => {
  const emu = Deno.env.get('FIREBASE_DATABASE_EMULATOR_HOST')
  const dbUrl = emu
    ? `http://${emu}/environments/production`
    : 'https://answerbuzzer-default-rtdb.asia-southeast1.firebasedatabase.app/environments/production'
  const db = ky.extend({
    prefixUrl: dbUrl,
    ...(emu ? { headers: { Authorization: 'Bearer owner' } } : {}),
  })
  const append = emu
    ? `?ns=demo-ansr-default-rtdb`
    : `?auth=${Deno.env.get('FIREBASE_DB_SECRET')!}`

  return {
    get: (path: string) => db.get(`${path}.json${append}`).json(),
    put: (path: string, data: any) =>
      db.put(`${path}.json${append}`, { json: data }),
  }
})()

export interface HandleContext {
  resolveDisplayName(userId: string): Promise<string>
}

export async function handle(
  input: { userId: string; text: string; time: number },
  context: HandleContext,
) {
  const time = Date.now()
  const { userId, text } = input
  const userState: UserState =
    (await dbClient.get(`users/${userId}/state`)) || {}
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

    const activeQuestionId = (await dbClient.get(
      `rooms/${roomId}/activeQuestionId`,
    )) as string | null
    if (!activeQuestionId) {
      return `no active question right now`
    }

    const myAnswer = (await dbClient.get(
      `rooms/${roomId}/answers/${activeQuestionId}/${userId}`,
    )) as { choice: number } | null
    if (myAnswer) {
      return `you have already answered this question (your answer: ${myAnswer.choice})`
    }

    const activeQuestion = (await dbClient.get(
      `rooms/${roomId}/questions/${activeQuestionId}`,
    )) as { numChoices?: number } | null
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

    await dbClient.put(
      `rooms/${roomId}/answers/${activeQuestionId}/${userId}`,
      { choice, createdAt: time },
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
    const pinInfo = (await dbClient.get(`pins/${pin}`)) as {
      roomId?: string
      expiresAt: number
    } | null
    if (!pinInfo?.roomId) {
      return `room with PIN R${pin} not found`
    }
    if (Date.now() > pinInfo.expiresAt) {
      return `room is not active`
    }

    const roomId = pinInfo.roomId

    // Check if the room is open for joining
    // const isOpen = (await dbClient.get(`rooms/${roomId}/open`)) as
    //   | boolean
    //   | null
    // if (!isOpen) {
    //   return `room is not open for joining, sorry`
    // }

    // Add the user info to the room
    const displayName = await context.resolveDisplayName(userId)
    await dbClient.put(
      `rooms/${roomId}/users/${userId}/displayName`,
      displayName,
    )

    // Update the user state
    await dbClient.put(`users/${userId}/state/currentRoomId`, roomId)

    return switching
      ? 'switched to a new room successfully! welcome!'
      : 'joined room successfully! welcome!'
  }
}

interface UserState {
  currentRoomId?: string
}
