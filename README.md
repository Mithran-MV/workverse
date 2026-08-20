# Workverse

A multiplayer virtual office: a 2D world you walk around in, where standing near
someone opens a video call, sitting at a computer starts a screen share, and a
whiteboard is a shared room you step into.

Built on [Colyseus](https://colyseus.io) for authoritative multiplayer state,
[Phaser 3](https://phaser.io) for the world, React for the interface layer over the
top, and WebRTC (via PeerJS) for the calls.

---

## What is in here

```
workverse/
├── server/        Colyseus game server - rooms, schema, message handlers
├── client/        Vite + React + Phaser client
│   └── Chat/      separate Next.js app: Push Protocol chat
├── types/         schema interfaces and message enums shared by both
└── Dockerfile     single-container build that serves the client from the server
```

The server is authoritative: clients send intent (`UPDATE_PLAYER`,
`ADD_CHAT_MESSAGE`), the server applies it to the room schema, and Colyseus
broadcasts the diff. The client mirrors that state into Redux, and Phaser renders
from there.

## Running it

Requires **Node 20 or newer**.

```bash
# server, on http://localhost:2567
cd workverse
npm install
npm run dev

# client, on http://localhost:5173, in a second terminal
cd workverse/client
npm install
npm run dev
```

Open the client in two browser windows to see the multiplayer working. Copy
`.env.example` to `.env` in both directories if you need to change anything; the
defaults work for local development.

### The chat app

`client/Chat` is a separate Next.js app using Push Protocol. It runs on its own:

```bash
cd workverse/client/Chat
npm install
npm run dev
```

Set `VITE_CHAT_APP_URL` in the client's `.env` to make the in-game Connect button
point at it. Without that variable the button is hidden rather than linking
somewhere that does not exist.

## Configuration

| Variable | Where | What it does |
|---|---|---|
| `PORT` | server | Port to listen on. Default 2567. |
| `CORS_ORIGINS` | server | Comma separated allowed origins. Unset allows any. |
| `COLYSEUS_MONITOR` | server | Mounts the Colyseus monitor at `/colyseus`. Off by default: it exposes room contents and can disconnect clients. |
| `SERVE_CLIENT` | server | Serve `client/dist` from the same process, for single-container deploys. |
| `VITE_SERVER_URL` | client | WebSocket URL of the server. **Required for a production build**; development falls back to port 2567 on the current host. |
| `VITE_CHAT_APP_URL` | client | URL of the chat app. The Connect button is hidden when unset. |
| `VITE_PRIVY_APP_ID` | client | Privy app id, for the wallet provider in `client/provider`. |

## Checks

```bash
cd workverse
npm run lint          # ESLint 9, flat config
npm run typecheck     # server and shared types
npm test              # multiplayer integration tests
npm run format:check  # prettier

cd client
npx tsc --noEmit      # client typecheck
npx vite build        # client build
```

The tests are worth a word: they start a real Colyseus server, connect to it over
a real WebSocket with the same client library the browser uses, and assert that
movement propagates between two players, that chat messages arrive with the right
author, that a disconnecting player is removed from state, and that a client
sending an id that does not exist cannot take the room down. That last one is a
regression test — those lookups used to be unguarded, and any client could crash
the room for everyone in it.

CI runs all of that on every push, plus builds of both front ends.

## Deploying

**Docker** — builds both halves and serves them from one process:

```bash
docker build --build-arg VITE_SERVER_URL=wss://your-host.example.com -t workverse .
docker run -p 2567:2567 workverse
```

Note that `VITE_*` variables are inlined at build time, so the server URL has to
be known when the image is built, not when it runs.

**Render** — `render.yaml` describes the server and the static client. Point the
client's `VITE_SERVER_URL` at the server service's `wss://` URL.

The `Procfile` targets Heroku, whose free tier no longer exists; it still works on
a paid dyno.

## Attribution

Workverse was written by [Fabio Mughilan](https://github.com/fabiomughilan).
This fork modernises it: the client could not be installed at all (a React 18 /
emoji-mart 3 peer conflict), the chat window's message list had been removed, no
React component had ever been typechecked, and linting was broken repository-wide.
See the commit history for the details.

The virtual-office concept follows in the footsteps of
[SkyOffice](https://github.com/kevinshen56714/SkyOffice).
