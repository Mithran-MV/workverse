import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client, Room } from 'colyseus.js'
import { createGameServer } from '../app'
import { RoomType } from '../../types/Rooms'
import { Message } from '../../types/Messages'
import { IOfficeState } from '../../types/IOfficeState'

/**
 * End-to-end tests for the multiplayer core.
 *
 * These drive the real Colyseus server built by createGameServer over a real WebSocket
 * with the same client library the browser uses, so they cover the wire protocol and the
 * schema encoding rather than just calling room methods directly. That is the part most
 * likely to break on a dependency bump, and the part hardest to notice is broken.
 */
describe('workverse room', () => {
  const port = 2599
  const endpoint = `ws://localhost:${port}`

  let gameServer: ReturnType<typeof createGameServer>['gameServer']

  /** Waits for a condition that a state update is expected to satisfy. */
  const eventually = async (predicate: () => boolean, message: string, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      if (predicate()) return
      await new Promise((resolve) => setTimeout(resolve, 25))
    }

    throw new Error(`timed out waiting for: ${message}`)
  }

  beforeAll(async () => {
    gameServer = createGameServer().gameServer
    await gameServer.listen(port)
  })

  afterAll(async () => {
    await gameServer.gracefullyShutdown(false)
  })

  it('lets a client join the public room and registers them in state', async () => {
    const client = new Client(endpoint)
    const room: Room<IOfficeState> = await client.joinOrCreate(RoomType.PUBLIC)

    await eventually(() => room.state.players.size >= 1, 'the joining player to appear in state')

    expect(room.state.players.get(room.sessionId)).toBeDefined()

    await room.leave()
  })

  it('propagates one player movement update to another player', async () => {
    const alice = await new Client(endpoint).joinOrCreate<IOfficeState>(RoomType.PUBLIC)
    const bob = await new Client(endpoint).joinOrCreate<IOfficeState>(RoomType.PUBLIC)

    await eventually(() => bob.state.players.size >= 2, 'both players to be in the room')

    alice.send(Message.UPDATE_PLAYER, { x: 123, y: 456, anim: 'adam_run_down' })

    await eventually(
      () => bob.state.players.get(alice.sessionId)?.x === 123,
      "alice's new position to reach bob"
    )

    const aliceSeenByBob = bob.state.players.get(alice.sessionId)

    expect(aliceSeenByBob?.y).toBe(456)
    expect(aliceSeenByBob?.anim).toBe('adam_run_down')

    await alice.leave()
    await bob.leave()
  })

  it('broadcasts a chat message to the other players in the room', async () => {
    const alice = await new Client(endpoint).joinOrCreate<IOfficeState>(RoomType.PUBLIC)
    const bob = await new Client(endpoint).joinOrCreate<IOfficeState>(RoomType.PUBLIC)

    await eventually(() => bob.state.players.size >= 2, 'both players to be in the room')

    alice.send(Message.UPDATE_PLAYER_NAME, { name: 'Alice' })
    alice.send(Message.ADD_CHAT_MESSAGE, { content: 'hello from the test' })

    await eventually(
      () => bob.state.chatMessages.some((m) => m.content === 'hello from the test'),
      'the chat message to reach bob'
    )

    const received = bob.state.chatMessages.find((m) => m.content === 'hello from the test')

    expect(received?.author).toBe('Alice')

    await alice.leave()
    await bob.leave()
  })

  it('removes a player from state when they disconnect', async () => {
    const alice = await new Client(endpoint).joinOrCreate<IOfficeState>(RoomType.PUBLIC)
    const bob = await new Client(endpoint).joinOrCreate<IOfficeState>(RoomType.PUBLIC)

    await eventually(() => bob.state.players.size >= 2, 'both players to be in the room')

    const aliceId = alice.sessionId
    await alice.leave()

    await eventually(
      () => bob.state.players.get(aliceId) === undefined,
      'alice to be removed from the room state'
    )

    await bob.leave()
  })

  it('does not crash the room when a client references an unknown item', async () => {
    const room = await new Client(endpoint).joinOrCreate<IOfficeState>(RoomType.PUBLIC)

    await eventually(() => room.state.players.size >= 1, 'the player to join')

    // Every one of these used to dereference the result of a map lookup without
    // checking it, so an id that does not exist took the whole room down with it.
    room.send(Message.CONNECT_TO_COMPUTER, { computerId: 'no-such-computer' })
    room.send(Message.DISCONNECT_FROM_COMPUTER, { computerId: 'no-such-computer' })
    room.send(Message.STOP_SCREEN_SHARE, { computerId: 'no-such-computer' })
    room.send(Message.CONNECT_TO_WHITEBOARD, { whiteboardId: 'no-such-whiteboard' })
    room.send(Message.DISCONNECT_FROM_WHITEBOARD, { whiteboardId: 'no-such-whiteboard' })

    // if the room survived, a normal message still round-trips
    room.send(Message.UPDATE_PLAYER, { x: 7, y: 7, anim: 'adam_idle_down' })

    await eventually(
      () => room.state.players.get(room.sessionId)?.x === 7,
      'the room to still be processing messages'
    )

    await room.leave()
  })
})
