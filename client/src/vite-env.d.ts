/// <reference types="vite/client" />

declare module '*.png'

/**
 * Every setting the client reads from the environment. Declaring them here means a typo
 * in an env var name is a compile error rather than a silently undefined value at runtime.
 */
interface ImportMetaEnv {
  /**
   * WebSocket URL of the Colyseus server, e.g. wss://workverse-server.example.com.
   * Required for a production build; in development the client falls back to port 2567
   * on the host serving the page.
   */
  readonly VITE_SERVER_URL?: string

  /** URL of the Push Protocol chat app. The Connect button is hidden when unset. */
  readonly VITE_CHAT_APP_URL?: string

  /** Privy application id, used by the (currently unmounted) wallet provider. */
  readonly VITE_PRIVY_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
