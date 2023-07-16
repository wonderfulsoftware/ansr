import { admin } from './admin'

const dbClient = (() => {
  return {
    get: (path: string) =>
      admin
        .database()
        .ref(`environments/production/${path}`)
        .once('value')
        .then((snapshot) => snapshot.val()),
    put: (path: string, data: any) =>
      admin.database().ref(`environments/production/${path}`).set(data),
  }
})()

export interface HandleContext {
  resolveDisplayName(userId: string): Promise<string>
  onJoin?: () => Promise<void>
  onLeave?: () => Promise<void>
}

export async function handle(
  input: { userId: string; text: string; time: number },
  context: HandleContext,
): Promise<string> {
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

    if (text === '.roominfo') {
      const pinInfo = await getPinInfo(userState.currentRoomPin || '')
      return `you are in a room ${
        pinInfo?.roomId === userState.currentRoomId
          ? '(PIN: R' + userState.currentRoomPin + ')'
          : '(no PIN)'
      }`
    }

    if (text === '.leave') {
      await dbClient.put(`users/${userId}/state/currentRoomId`, null)
      await dbClient.put(`users/${userId}/state/currentRoomPin`, null)
      await context.onLeave?.()
      return 'you left the room'
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
    if (!(1 <= choice && choice <= numChoices)) {
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
    const pinInfo = await getPinInfo(pin)
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
    await dbClient.put(`users/${userId}/state/currentRoomPin`, pin)

    // Call hook
    await context.onJoin?.()

    return switching
      ? 'switched to a new room successfully! welcome!'
      : 'joined room successfully! welcome!'
  }
}

async function getPinInfo(pin: string) {
  return (await dbClient.get(`pins/${pin}`)) as {
    roomId?: string
    expiresAt: number
  } | null
}

interface UserState {
  currentRoomId?: string
  currentRoomPin?: string
}
