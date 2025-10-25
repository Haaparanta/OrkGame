// Backend API types based on actual Python models
export interface Command {
  action1: string
  action2: string 
  action3: string
  player: string
  enemy: string
}

export interface GameSession {
  name: string
  currenthealth: number
  maxhealth: number
  armor: number
  rage: number
  enemycurrenthealth: number
  enemymaxhealth: number
  actions: Action[]
}

export interface Action {
  name: string
  actor: "player" | "enemy"
  effect: Effect
}

export interface Effect {
  self_heal: number
  self_damage: number
  gain_armor: number
  loose_armor: number
  gain_damage_boost: number
  loose_damage_boost: number
  enemy_heal: number
  enemy_damage: number
}

type QueryValue = string | number | boolean | undefined

const DEFAULT_BASE_URL = "https://orkgamez.serverlul.win/api"
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_BASE_URL).replace(
  /\/$/,
  "",
)

// API Logging utility
class ApiLogger {
  private static logToConsole = true
  private static logToStorage = true
  private static maxStoredLogs = 100

  static log(endpoint: string, method: string, params: any, result: any, error?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      endpoint,
      method,
      params: this.sanitizeParams(params),
      result: this.sanitizeResult(result),
      error: error ? this.sanitizeError(error) : null,
      success: !error
    }

    if (this.logToConsole) {
      if (error) {
        console.error(`[API ERROR] ${method} ${endpoint}`, logEntry)
      } else {
        console.log(`[API] ${method} ${endpoint}`, logEntry)
      }
    }

    if (this.logToStorage) {
      this.storeLog(logEntry)
    }
  }

  private static sanitizeParams(params: any): any {
    if (!params) return null
    try {
      return JSON.parse(JSON.stringify(params))
    } catch {
      return String(params)
    }
  }

  private static sanitizeResult(result: any): any {
    if (!result) return null
    try {
      // Truncate large results for logging
      const stringified = JSON.stringify(result)
      if (stringified.length > 1000) {
        return `[Large result: ${stringified.length} chars] ${stringified.substring(0, 200)}...`
      }
      return result
    } catch {
      return String(result)
    }
  }

  private static sanitizeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // Limit stack trace
      }
    }
    if (error instanceof ApiError) {
      return {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.details
      }
    }
    return error
  }

  private static storeLog(logEntry: any) {
    try {
      const stored = localStorage.getItem('orkgame_api_logs')
      const logs = stored ? JSON.parse(stored) : []
      logs.push(logEntry)
      
      // Keep only the latest logs
      if (logs.length > this.maxStoredLogs) {
        logs.splice(0, logs.length - this.maxStoredLogs)
      }
      
      localStorage.setItem('orkgame_api_logs', JSON.stringify(logs))
    } catch (error) {
      console.warn('Failed to store API log:', error)
    }
  }

  static getLogs(): any[] {
    try {
      const stored = localStorage.getItem('orkgame_api_logs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static clearLogs() {
    try {
      localStorage.removeItem('orkgame_api_logs')
    } catch (error) {
      console.warn('Failed to clear API logs:', error)
    }
  }
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

interface FetchOptions {
  path: string
  method?: "GET" | "POST"
  body?: unknown
  query?: Record<string, QueryValue>
  signal?: AbortSignal
  headers?: HeadersInit
  cache?: RequestCache
  credentials?: RequestCredentials
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const searchParams = new URLSearchParams()

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue
      searchParams.append(key, String(value))
    }
  }

  const search = searchParams.size ? `?${searchParams.toString()}` : ""
  return `${API_BASE_URL}${normalizedPath}${search}`
}

async function apiFetch<T>({
  path,
  method = "GET",
  body,
  query,
  signal,
  headers,
  cache = "no-store",
  credentials = "include", // Default to include credentials
}: FetchOptions): Promise<T> {
  const url = buildUrl(path, query)
  const init: RequestInit = {
    method,
    signal,
    cache,
    credentials,
    headers: {
      Accept: "application/json",
      ...headers,
    },
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = {
      "Content-Type": "application/json",
      ...init.headers,
    }
  }

  // Log the request parameters
  const requestParams = {
    url,
    method,
    body,
    query,
    headers: init.headers,
    credentials: init.credentials
  }

  let response: Response
  let result: T

  try {
    response = await fetch(url, init)
  } catch (error) {
    const apiError = new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      0,
    )
    ApiLogger.log(path, method, requestParams, null, apiError)
    throw apiError
  }

  if (!response.ok) {
    let parsed: unknown
    try {
      const text = await response.text()
      parsed = text ? JSON.parse(text) : undefined
    } catch {
      parsed = undefined
    }

    const message =
      (parsed as { message?: string })?.message ??
      `Request failed with status ${response.status}`
    const code = (parsed as { error?: string })?.error

    const apiError = new ApiError(message, response.status, code, parsed)
    ApiLogger.log(path, method, requestParams, null, apiError)
    throw apiError
  }

  const contentLength = response.headers.get("content-length")
  if (contentLength === "0" || response.status === 204) {
    result = undefined as T
  } else {
    result = (await response.json()) as T
  }

  // Log successful response
  ApiLogger.log(path, method, requestParams, result)
  
  return result
}

// Get current session ID
export async function getCurrentSession(signal?: AbortSignal): Promise<string> {
  try {
    const result = await apiFetch<string>({
      path: "/current-session",
      signal,
    })
    ApiLogger.log("getCurrentSession", "GET", { signal: !!signal }, result)
    return result
  } catch (error) {
    ApiLogger.log("getCurrentSession", "GET", { signal: !!signal }, null, error)
    throw error
  }
}

// Get current session state
export async function getSessionState(signal?: AbortSignal): Promise<GameSession> {
  try {
    const result = await apiFetch<GameSession>({
      path: "/session-state", 
      signal,
    })
    ApiLogger.log("getSessionState", "GET", { signal: !!signal }, result)
    return result
  } catch (error) {
    ApiLogger.log("getSessionState", "GET", { signal: !!signal }, null, error)
    throw error
  }
}

// Generate new Orkish words
export async function getNewWordsPlayer(signal?: AbortSignal): Promise<string> {
  try {
    const result = await apiFetch<string>({
      path: "/new-words-player",
      signal,
    })
    ApiLogger.log("getNewWordsPlayer", "GET", { signal: !!signal }, result)
    return result
  } catch (error) {
    ApiLogger.log("getNewWordsPlayer", "GET", { signal: !!signal }, null, error)
    throw error
  }
}

// Submit a battle command
export async function submitCommand(
  command: Command,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const result = await apiFetch<string>({
      path: "/command",
      method: "POST",
      body: command,
      signal,
    })
    ApiLogger.log("submitCommand", "POST", { command, signal: !!signal }, result)
    return result
  } catch (error) {
    ApiLogger.log("submitCommand", "POST", { command, signal: !!signal }, null, error)
    throw error
  }
}

// Attach to a session
export async function attachSession(
  sessionName: string,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const result = await apiFetch<void>({
      path: "/attach-session",
      method: "POST",
      body: { session_name: sessionName },
      signal,
    })
    ApiLogger.log("attachSession", "POST", { sessionName, signal: !!signal }, result)
    return result
  } catch (error) {
    ApiLogger.log("attachSession", "POST", { sessionName, signal: !!signal }, null, error)
    throw error
  }
}

// Mock archetype data since backend doesn't have this endpoint
export async function fetchArchetypes(signal?: AbortSignal): Promise<any[]> {
  return [
    {
      id: "warboss",
      name: "Warboss",
      description: "A mighty Ork leader who commands respect through brutal strength",
      baseStats: {
        hp: 120,
        armor: 10,
        rage: 0
      },
      startingWords: ["WAAGH", "KRUMP", "BOSS"]
    },
    {
      id: "burna-boy",
      name: "Burna Boy", 
      description: "Pyromaniac Ork who loves to burn everything in sight",
      baseStats: {
        hp: 80,
        armor: 5,
        rage: 0
      },
      startingWords: ["BURN", "FIRE", "ROAST"]
    },
    {
      id: "rokkit-boy",
      name: "Rokkit Boy",
      description: "Explosive specialist who makes things go BOOM",
      baseStats: {
        hp: 90,
        armor: 0,
        rage: 0
      },
      startingWords: ["BOOM", "ROKKIT", "BLAST"]
    }
  ]
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

// Export ApiLogger for external access to logs
export { ApiLogger }

// Utility functions for log management
export function getApiLogs() {
  return ApiLogger.getLogs()
}

export function clearApiLogs() {
  ApiLogger.clearLogs()
}

// Adapter functions to bridge the gap between frontend expectations and backend reality
// These functions adapt the simple backend API to match the complex frontend expectations

export async function startGame(
  payload: any,
  signal?: AbortSignal,
): Promise<any> {
  try {
    // For now, just attach to a session and return a mock game state
    const sessionName = `session_${Date.now()}`
    await attachSession(sessionName, signal)
    
    // Return a mock game state that matches what the frontend expects
    const result = {
      sessionId: sessionName,
      seed: 12345,
      wave: 1,
      score: 0,
      phase: "battle",
      player: {
        id: "player",
        name: "Ork Warboss",
        hp: 100,
        hpMax: 100,
        rage: 0,
        ammo: 10,
        cover: false,
        damageMod: 0,
        armor: 0,
        distance: "medium",
        words: ["WAAGH", "KRUMP", "DAKKA"],
        traits: [],
        flags: {}
      },
      enemy: {
        id: "enemy", 
        name: "Enemy",
        hp: 100,
        hpMax: 100,
        rage: 0,
        ammo: 10,
        cover: false,
        damageMod: 0,
        armor: 0,
        distance: "medium",
        words: [],
        traits: [],
        flags: {}
      },
      limits: {
        maxWordsPerTurn: 3,
        maxHand: 10
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    ApiLogger.log("startGame", "POST", { payload, signal: !!signal }, result)
    return result
  } catch (error) {
    ApiLogger.log("startGame", "POST", { payload, signal: !!signal }, null, error)
    throw error
  }
}

export async function fetchGameState(
  sessionId: string,
  signal?: AbortSignal,
): Promise<any> {
  try {
    // Check if we have a valid session first
    const currentSession = await getCurrentSession(signal)
    if (!currentSession || currentSession === "temp_session") {
      // If no valid session, create one
      await attachSession(sessionId, signal)
    }
    
    // Get the actual backend session state and convert it to frontend format
    const backendState = await getSessionState(signal)
    
    const result = {
      sessionId: sessionId,
      seed: 12345,
      wave: 1,
      score: 0,
      phase: "battle",
      player: {
        id: "player",
        name: "Ork Warboss", 
        hp: backendState.currenthealth,
        hpMax: backendState.maxhealth,
        rage: backendState.rage,
        ammo: 10,
        cover: false,
        damageMod: 0,
        armor: backendState.armor,
        distance: "medium",
        words: ["WAAGH", "KRUMP", "DAKKA"],
        traits: [],
        flags: {}
      },
      enemy: {
        id: "enemy",
        name: "Enemy",
        hp: backendState.enemycurrenthealth,
        hpMax: backendState.enemymaxhealth,
        rage: 0,
        ammo: 10,
        cover: false,
        damageMod: 0,
        armor: 0,
        distance: "medium",
        words: [],
        traits: [],
        flags: {}
      },
      limits: {
        maxWordsPerTurn: 3,
        maxHand: 10
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    ApiLogger.log("fetchGameState", "GET", { sessionId, signal: !!signal }, result)
    return result
  } catch (error) {
    ApiLogger.log("fetchGameState", "GET", { sessionId, signal: !!signal }, null, error)
    throw error
  }
}

export async function submitTurn(
  sessionId: string,
  payload: any,
  signal?: AbortSignal,
): Promise<any> {
  try {
    // Convert frontend turn request to backend command
    const words = payload.words || []
    const command: Command = {
      action1: words[0] || "WAAGH",
      action2: words[1] || "KRUMP", 
      action3: words[2] || "DAKKA",
      player: "Warboss",
      enemy: "Human"
    }
    
    // Submit command to backend
    const response = await submitCommand(command, signal)
    
    // Get updated state
    const updatedState = await getSessionState(signal)
    
    // Return mock turn resolution
    const result = {
      turn: 1,
      playerWords: words,
      enemyWords: [],
      playerPlan: {
        text: response,
        steps: [],
        speaks: [response]
      },
      enemyPlan: {
        text: "",
        steps: [],
        speaks: []
      },
      log: [response],
      stateAfter: await fetchGameState(sessionId, signal),
      end: {}
    }
    
    ApiLogger.log("submitTurn", "POST", { sessionId, payload, signal: !!signal }, result)
    return result
  } catch (error) {
    ApiLogger.log("submitTurn", "POST", { sessionId, payload, signal: !!signal }, null, error)
    throw error
  }
}

export async function fetchRewards(
  sessionId: string,
  signal?: AbortSignal,
): Promise<any[]> {
  // Return empty rewards for now
  return []
}

export async function pickReward(
  sessionId: string,
  payload: any,
  signal?: AbortSignal,
): Promise<any> {
  // Just return current state
  return fetchGameState(sessionId, signal)
}

export async function endGame(
  sessionId: string,
  signal?: AbortSignal,
): Promise<any> {
  return {
    finalScore: 100,
    wavesCleared: 1,
    seed: 12345
  }
}
