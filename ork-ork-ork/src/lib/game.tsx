'use client'

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react"

import {
  getCurrentSession,
  getSessionState,
  getNewWordsPlayer,
  submitCommand,
  attachSession,
  startGame as apiStartGame,
  fetchGameState,
  submitTurn as apiSubmitTurn,
  fetchRewards as apiFetchRewards,
  pickReward as apiPickReward,
  endGame as apiEndGame,
  ApiError,
} from "./api"
import type {
  BuffChoice,
  GameState,
  PickBuffRequest,
  StartGameRequest,
  TurnRequest,
  TurnResolution,
} from "./types"

export const DEFAULT_WORD_LIBRARY = [
  "WAAGH",
  "SMASH",
  "SHOOT",
  "BOOM",
  "CHARGE",
  "COVER",
  "BURN",
  "FIXIT",
  "SNEAK",
  "DAKKA",
] as const

const SESSION_STORAGE_KEY = "ork-ork-ork/sessionId"

interface GameStore {
  state?: GameState
  lastTurn?: TurnResolution
  rewards?: BuffChoice[]
  isLoading: boolean
  error?: string
}

type GameAction =
  | { type: "set_state"; payload?: GameState }
  | { type: "set_last_turn"; payload?: TurnResolution }
  | { type: "set_rewards"; payload?: BuffChoice[] }
  | { type: "set_loading"; payload: boolean }
  | { type: "set_error"; payload?: string }
  | { type: "reset" }

const INITIAL_STORE: GameStore = {
  state: undefined,
  lastTurn: undefined,
  rewards: undefined,
  isLoading: false,
  error: undefined,
}

function reducer(store: GameStore, action: GameAction): GameStore {
  switch (action.type) {
    case "set_state":
      return {
        ...store,
        state: action.payload,
        error: undefined,
      }
    case "set_last_turn":
      return {
        ...store,
        lastTurn: action.payload,
      }
    case "set_rewards":
      return {
        ...store,
        rewards: action.payload,
      }
    case "set_loading":
      return {
        ...store,
        isLoading: action.payload,
      }
    case "set_error":
      return {
        ...store,
        error: action.payload,
      }
    case "reset":
      return { ...INITIAL_STORE }
    default:
      return store
  }
}

interface GameContextValue {
  store: GameStore
  dispatch: Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, INITIAL_STORE)

  useEffect(() => {
    if (typeof window === "undefined") return
    const sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!sessionId) return

    dispatch({ type: "set_loading", payload: true })
    fetchGameState(sessionId)
      .then((state) => {
        dispatch({ type: "set_state", payload: state })
      })
      .catch((error) => {
        const message =
          error instanceof ApiError ? error.message : "Failed to resume session."
        dispatch({ type: "set_error", payload: message })
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
      })
      .finally(() => {
        dispatch({ type: "set_loading", payload: false })
      })
  }, [dispatch])

  useEffect(() => {
    if (typeof window === "undefined") return
    const sessionId = store.state?.sessionId
    if (sessionId) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    } else {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }, [store.state?.sessionId])

  const value = useMemo<GameContextValue>(
    () => ({
      store,
      dispatch,
    }),
    [store],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

function formatErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message || "API request failed."
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Something went wrong."
}

export function useGameStore() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGameStore must be used within GameProvider")
  }
  return context.store
}

export function useGameActions() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGameActions must be used within GameProvider")
  }

  const { dispatch } = context

  const runWithLoading = useCallback(
    async <T,>(task: () => Promise<T>): Promise<T> => {
      dispatch({ type: "set_loading", payload: true })
      dispatch({ type: "set_error", payload: undefined })

      try {
        const result = await task()
        return result
      } catch (error) {
        dispatch({ type: "set_error", payload: formatErrorMessage(error) })
        throw error
      } finally {
        dispatch({ type: "set_loading", payload: false })
      }
    },
    [dispatch],
  )

  const startNewGame = useCallback(
    (payload: StartGameRequest) =>
      runWithLoading(async () => {
        const state = await apiStartGame(payload)
        dispatch({ type: "set_state", payload: state })
        dispatch({ type: "set_last_turn", payload: undefined })
        dispatch({ type: "set_rewards", payload: undefined })
        return state
      }),
    [dispatch, runWithLoading],
  )

  const resumeSession = useCallback(
    (sessionId: string) =>
      runWithLoading(async () => {
        const state = await fetchGameState(sessionId)
        dispatch({ type: "set_state", payload: state })
        return state
      }),
    [dispatch, runWithLoading],
  )

  const playTurn = useCallback(
    (sessionId: string, payload: TurnRequest) =>
      runWithLoading(async () => {
        const resolution = await apiSubmitTurn(sessionId, payload)
        dispatch({ type: "set_last_turn", payload: resolution })
        dispatch({ type: "set_state", payload: resolution.stateAfter })
        return resolution
      }),
    [dispatch, runWithLoading],
  )

  const loadRewards = useCallback(
    (sessionId: string) =>
      runWithLoading(async () => {
        const rewards = await apiFetchRewards(sessionId)
        dispatch({ type: "set_rewards", payload: rewards })
        return rewards
      }),
    [dispatch, runWithLoading],
  )

  const chooseReward = useCallback(
    (sessionId: string, payload: PickBuffRequest) =>
      runWithLoading(async () => {
        const state = await apiPickReward(sessionId, payload)
        dispatch({ type: "set_state", payload: state })
        dispatch({ type: "set_rewards", payload: undefined })
        return state
      }),
    [dispatch, runWithLoading],
  )

  const completeRun = useCallback(
    (sessionId: string) =>
      runWithLoading(async () => {
        const result = await apiEndGame(sessionId)
        dispatch({ type: "reset" })
        return result
      }),
    [dispatch, runWithLoading],
  )

  const clearGame = useCallback(() => {
    dispatch({ type: "reset" })
  }, [dispatch])

  return {
    startNewGame,
    resumeSession,
    playTurn,
    loadRewards,
    chooseReward,
    completeRun,
    clearGame,
  }
}

export function isBattlePhase(state?: GameState) {
  return state?.phase === "battle"
}

export function isRewardsPhase(state?: GameState) {
  return state?.phase === "rewards"
}

export function isGameOver(state?: GameState) {
  return state?.phase === "gameover"
}

export function getPlayerWords(state?: GameState) {
  return state?.player.words ?? []
}

export function getEnemyWords(state?: GameState) {
  return state?.enemy.words ?? []
}
