/* eslint-disable no-console */
import type {
  BuffChoice,
  GameState,
  Phase,
  PickBuffRequest,
  Plan,
  PlanStep,
  StartGameRequest,
  TurnRequest,
  TurnResolution,
} from "./types"

type QueryValue = string | number | boolean | undefined

const DEFAULT_BASE_URL = "https://orkgamez.serverlul.win/api"
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_BASE_URL).replace(
  /\/$/,
  "",
)

const ARCHETYPE_TRAITS: Record<string, string[]> = {
  warboss: ["boss", "unyielding"],
  "rokkit-boy": ["explosive"],
  "burna-boy": ["pyromaniac"],
}

const SESSION_META_KEY = "ork-ork-ork/session-meta"

export interface Command {
  action1: string
  action2: string
  action3: string
  player: string
}

interface BackendEffect {
  self_heal: number
  self_damage: number
  gain_armor: number
  loose_armor: number
  gain_damage_boost: number
  loose_damage_boost: number
  enemy_heal: number
  enemy_damage: number
}

interface BackendAction {
  name: string
  actor: "player" | "enemy"
  effect: BackendEffect
}

interface BackendGameSession {
  name: string
  currenthealth: number
  maxhealth: number
  armor: number
  rage: number
  enemycurrenthealth: number
  enemymaxhealth: number
  enemyrage: number
  enemyarmor: number
  gameover: boolean
  kills: number
  current_enemy: { role: string }
  actions: BackendAction[]
}

interface AttachSessionResponse {
  message: string
  session_name: string
}

interface SessionMeta {
  sessionId: string
  playerName?: string
  archetypeId?: string
  words?: string[]
  enemyName?: string
}

interface AdaptStateOptions {
  sessionId: string
  backend: BackendGameSession
  playerName?: string
  archetypeId?: string
  playerWords?: string[]
  enemyWords?: string[]
  previousState?: GameState
}

interface ResolutionOptions {
  sessionId: string
  responseText: string
  enemyResponseText: string
  usedWords: string[]
  previousBackend: BackendGameSession
  updatedBackend: BackendGameSession
  stateAfter: GameState
  enemyWords: string[]
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

  const search = searchParams.size ? `?${searchParams}` : ""
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
  credentials = "include",
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

  const requestSummary = {
    url,
    method,
    body,
    query,
    headers: init.headers,
    credentials: init.credentials,
  }

  // Add timeout for /command endpoint (60 seconds) since it depends on external AI services
  const timeoutMs = path === "/command" ? 60000 : 30000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new ApiError("Request timeout", 408, "TIMEOUT"))
    }, timeoutMs)
  })

  let response: Response
  try {
    response = await Promise.race([fetch(url, init), timeoutPromise])
  } catch (error) {
    const apiError = error instanceof ApiError 
      ? error 
      : new ApiError(
          error instanceof Error ? error.message : "Network request failed",
          0,
        )
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
    throw apiError
  }

  const contentLength = response.headers.get("content-length")
  const shouldParseJson = contentLength !== "0" && response.status !== 204

  const result = shouldParseJson ? ((await response.json()) as T) : (undefined as T)
  return result
}

function isBrowser() {
  return typeof window !== "undefined"
}

function readSessionMetaMap(): Record<string, SessionMeta> {
  if (!isBrowser()) return {}
  try {
    const raw = window.sessionStorage.getItem(SESSION_META_KEY)
    return raw ? (JSON.parse(raw) as Record<string, SessionMeta>) : {}
  } catch {
    return {}
  }
}

function writeSessionMetaMap(map: Record<string, SessionMeta>) {
  if (!isBrowser()) return
  try {
    window.sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(map))
  } catch {
    // ignore storage failures
  }
}

function getSessionMeta(sessionId: string): SessionMeta | undefined {
  const map = readSessionMetaMap()
  return map[sessionId]
}

function persistSessionMeta(meta: SessionMeta) {
  if (!meta.sessionId) return
  const map = readSessionMetaMap()
  map[meta.sessionId] = {
    ...map[meta.sessionId],
    ...meta,
  }
  writeSessionMetaMap(map)
}

function generateSessionId() {
  const prefix = "session"
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now()}_${random}`
}

function sanitizeWord(word: string) {
  return word.replace(/[^A-Za-z0-9!?\-]/g, "").toUpperCase()
}

function dedupeWords(words: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const word of words) {
    const sanitized = sanitizeWord(word)
    if (!sanitized) continue
    if (!seen.has(sanitized)) {
      seen.add(sanitized)
      result.push(sanitized)
    }
  }
  return result
}

function normalizeWords(input?: string[] | string): string[] {
  if (Array.isArray(input)) {
    return dedupeWords(input)
  }
  if (typeof input === "string") {
    return dedupeWords(input.split(/\s+/))
  }
  return []
}

function ensureWords(preferred?: string[], fallback?: string[]): string[] {
  const normalized = normalizeWords(preferred)
  if (normalized.length) return normalized
  return normalizeWords(fallback) ?? []
}

function computeSeed(sessionId: string) {
  const digits = sessionId.replace(/\D/g, "")
  if (digits) {
    return Number.parseInt(digits.slice(-9), 10)
  }
  let hash = 0
  for (let index = 0; index < sessionId.length; index += 1) {
    hash = (hash << 5) - hash + sessionId.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function deriveScore(session: BackendGameSession) {
  const damage = session.enemymaxhealth - session.enemycurrenthealth
  const mitigation = session.maxhealth - session.currenthealth
  return Math.max(0, damage * 10 - Math.max(0, mitigation * 5))
}

function derivePhase(session: BackendGameSession): Phase {
  if (session.currenthealth <= 0) return "gameover"
  if (session.enemycurrenthealth <= 0) return "rewards"
  return "battle"
}

function describeEffect(action: BackendAction) {
  const { effect } = action
  const fragments: string[] = []
  if (effect.enemy_damage > 0) {
    fragments.push(`dealt ${effect.enemy_damage} dmg`)
  }
  if (effect.enemy_heal > 0) {
    fragments.push(`healed enemy ${effect.enemy_heal}`)
  }
  if (effect.self_heal > 0) {
    fragments.push(`self-healed ${effect.self_heal}`)
  }
  if (effect.self_damage > 0) {
    fragments.push(`took ${effect.self_damage} dmg`)
  }
  if (effect.gain_damage_boost > 0) {
    fragments.push(`rage +${effect.gain_damage_boost}`)
  }
  if (effect.loose_damage_boost > 0) {
    fragments.push(`rage -${effect.loose_damage_boost}`)
  }
  if (effect.gain_armor > 0) {
    fragments.push(`armor +${effect.gain_armor}`)
  }
  if (effect.loose_armor > 0) {
    fragments.push(`armor -${effect.loose_armor}`)
  }
  return fragments.join("; ") || "no visible effect"
}

function actionToPlanStep(action: BackendAction): PlanStep {
  const delta: Record<string, number> = {}
  const { effect } = action
  if (effect.self_heal) delta.self_heal = effect.self_heal
  if (effect.self_damage) delta.self_damage = effect.self_damage
  if (effect.enemy_damage) delta.enemy_damage = effect.enemy_damage
  if (effect.enemy_heal) delta.enemy_heal = effect.enemy_heal
  if (effect.gain_damage_boost) delta.rage_gain = effect.gain_damage_boost
  if (effect.loose_damage_boost) delta.rage_loss = effect.loose_damage_boost
  if (effect.gain_armor) delta.armor_gain = effect.gain_armor
  if (effect.loose_armor) delta.armor_loss = effect.loose_armor

  return {
    action: action.name,
    target: action.actor === "player" ? "enemy" : "player",
    delta,
    log: describeEffect(action),
    tags: [],
  }
}

function actionsToWords(actions: BackendAction[]) {
  return actions.map((action) => action.name.replace(/_/g, " ").toUpperCase())
}

function deriveEnemyWordsFromResponse(responseText: string): string[] {
  if (!responseText) return []
  
  // Extract potential action words from the response
  // Common patterns: "KRUMP", "DAKKA", "WAAGH", etc.
  // Match uppercase words that are 3-20 characters long
  const matches = responseText.match(/\b[A-Z][A-Z0-9_]*\b/g) || []
  
  // Filter to likely action words (typically verbs or nouns in all caps)
  const actionWords = matches.filter(word => {
    // Exclude common words and keep likely action names
    const excluded = ["ME", "DA", "DE", "THE", "IS", "ARE", "AND", "OR", "IF", "BY", "TO", "WITH", "FOR"]
    return !excluded.includes(word) && word.length >= 3
  })
  
  return dedupeWords(actionWords).slice(0, 3)
}

function buildPlan(actions: BackendAction[], fallbackText: string): Plan {
  const steps = actions.map(actionToPlanStep)
  const speaks = steps.map((step) => step.log).filter(Boolean)
  return {
    text: fallbackText,
    steps,
    speaks: speaks.length ? speaks : (fallbackText ? [fallbackText] : []),
  }
}

function capitalizeEnemyRole(role: string): string {
  return role
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .toUpperCase()
}

function adaptBackendSession({
  sessionId,
  backend,
  playerName,
  archetypeId,
  playerWords,
  enemyWords,
  previousState,
}: AdaptStateOptions): GameState {
  const nowIso = new Date().toISOString()
  const safePlayerName =
    playerName?.trim() ??
    previousState?.player.name ??
    (previousState?.player.id === "rokkit-boy" ? "ROKKIT LAD" : "ORK WARBOSS")
  const safeArchetypeId =
    archetypeId ?? previousState?.player.id ?? (playerName ? "warboss" : "warboss")
  const safePlayerWords = ensureWords(playerWords, previousState?.player.words)
  const safeEnemyWords = ensureWords(enemyWords, previousState?.enemy.words)

  // Debug logging for enemy words
  if (enemyWords && enemyWords.length > 0) {
    console.log("[adaptBackendSession] Enemy words processing:", {
      inputEnemyWords: enemyWords,
      safeEnemyWords,
      fallbackEnemyWords: previousState?.enemy.words,
    })
  }

  const phase = derivePhase(backend)
  const score = deriveScore(backend)
  
  // Derive enemy name from current_enemy role
  const enemyRole = backend.current_enemy?.role ?? previousState?.enemy.id ?? "enemy"
  const enemyName = previousState?.enemy.name ?? capitalizeEnemyRole(enemyRole)

  return {
    sessionId,
    seed: computeSeed(sessionId),
    wave: Math.max(1, Math.floor(score / 250) + 1),
    score,
    phase,
    player: {
      id: safeArchetypeId,
      name: safePlayerName.toUpperCase(),
      hp: clamp(backend.currenthealth, 0, backend.maxhealth),
      hpMax: backend.maxhealth,
      rage: backend.rage,
      cover: backend.armor > 0,
      armor: backend.armor,
      distance: previousState?.player.distance ?? "medium",
      words: safePlayerWords,
      traits: ARCHETYPE_TRAITS[safeArchetypeId] ?? previousState?.player.traits ?? [],
      flags: previousState?.player.flags ?? {},
    },
    enemy: {
      id: enemyRole,
      name: enemyName,
      hp: clamp(backend.enemycurrenthealth, 0, backend.enemymaxhealth),
      hpMax: backend.enemymaxhealth,
      rage: backend.enemyrage ?? previousState?.enemy.rage ?? 0,
      cover: backend.enemyarmor > 0,
      armor: backend.enemyarmor ?? previousState?.enemy.armor ?? 0,
      distance: previousState?.enemy.distance ?? "medium",
      words: safeEnemyWords,
      traits: previousState?.enemy.traits ?? [enemyRole],
      flags: previousState?.enemy.flags ?? {},
    },
    limits: {
      maxWordsPerTurn: 3,
      maxHand: Math.max(3, safePlayerWords.length),
    },
    createdAt: previousState?.createdAt ?? nowIso,
    updatedAt: nowIso,
  }
}

function buildTurnResolution({
  responseText,
  enemyResponseText,
  usedWords,
  previousBackend,
  updatedBackend,
  stateAfter,
  enemyWords,
}: ResolutionOptions): TurnResolution {
  const turnNumber = updatedBackend.actions.length
  const newActions = updatedBackend.actions.slice(previousBackend.actions.length)
  const playerActions = newActions.filter((action) => action.actor === "player")
  const enemyActions = newActions.filter((action) => action.actor === "enemy")

  const playerPlan = buildPlan(playerActions, responseText)
  const enemyPlan = buildPlan(enemyActions, enemyResponseText)

  const logEntries = [
    responseText,
    ...newActions.map((action) => `${action.actor}: ${describeEffect(action)}`),
  ].filter(Boolean)

  const endState = {
    enemyDefeated: stateAfter.enemy.hp <= 0,
    playerDefeated: stateAfter.player.hp <= 0,
  }

  return {
    turn: turnNumber,
    playerWords: normalizeWords(usedWords),
    enemyWords: normalizeWords(enemyWords),
    playerPlan,
    enemyPlan,
    log: logEntries,
    stateAfter,
    end: endState,
  }
}

async function waitForStateChange(
  previousSize: number,
  signal?: AbortSignal,
): Promise<BackendGameSession> {
  const maxAttempts = 5
  const backoff = [100, 200, 350, 500, 750]
  let lastState = await getSessionState(signal)
  if (lastState.actions.length > previousSize) {
    return lastState
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, backoff[attempt])
      signal?.addEventListener("abort", () => {
        clearTimeout(timer)
        resolve()
      })
    })
    lastState = await getSessionState(signal)
    if (lastState.actions.length > previousSize) {
      return lastState
    }
  }
  return lastState
}

async function safeGetNewWords(signal?: AbortSignal): Promise<string[]> {
  try {
    const words = await getNewWordsPlayer(signal)
    return ensureWords(normalizeWords(words))
  } catch (error) {
    return []
  }
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export async function getCurrentSession(signal?: AbortSignal): Promise<string | null> {
  return apiFetch<string | null>({
    path: "/current-session",
    signal,
  })
}

export async function getSessionState(signal?: AbortSignal): Promise<BackendGameSession> {
  return apiFetch<BackendGameSession>({
    path: "/session-state",
    signal,
  })
}

export async function getNewWordsPlayer(signal?: AbortSignal): Promise<string> {
  return apiFetch<string>({
    path: "/new-words-player",
    signal,
  })
}

export async function submitCommand(command: Command, signal?: AbortSignal): Promise<[string, string]> {
  try {
    return await apiFetch<[string, string]>({
      path: "/command",
      method: "POST",
      body: command,
      signal,
    })
  } catch (error) {
    // Log the error with more details
    console.error("[submitCommand] Failed to submit command:", error)
    if (error instanceof ApiError) {
      console.error("[submitCommand] ApiError details:", {
        status: error.status,
        code: error.code,
        message: error.message,
        details: error.details,
      })
      
      // If backend is having issues (500 error or timeout), provide helpful error message
      if (error.status === 500 || error.status === 408) {
        const msg = error.status === 500 
          ? "Backend server error. Check that: 1) OpenAI API key is set, 2) MCP server is running, 3) All dependencies are installed"
          : "Command request timed out. The AI service may be taking too long or not responding."
        const detailError = new ApiError(msg, error.status, error.code, error.details)
        throw detailError
      }
    }
    throw error
  }
}

export async function attachSession(
  sessionName: string,
  signal?: AbortSignal,
): Promise<void> {
  if (!sessionName) {
    throw new ApiError("session_name is required", 400)
  }
  await apiFetch<AttachSessionResponse>({
    path: "/attach-session",
    method: "POST",
    body: { session_name: sessionName },
    signal,
  })
}

export async function fetchArchetypes(signal?: AbortSignal) {
  try {
    return await apiFetch<Array<{
      id: string
      name: string
      description: string
      baseStats: { hpMax: number; armor: number; rage: number }
    }>>({
      path: "/archetypes",
      signal,
    })
  } catch (error) {
    return []
  }
}

export async function selectArchetype(
  archetypeId: string,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await apiFetch<{ message: string; archetype_id: string; archetype: unknown }>({
      path: "/archetype",
      method: "POST",
      body: { archetype_id: archetypeId },
      signal,
    })
  } catch (error) {
    throw error
  }
}

export async function startGame(
  payload: StartGameRequest & { playerName?: string },
  signal?: AbortSignal,
): Promise<GameState> {
  const sessionId = generateSessionId()
  
  // Attach the session to set the game-session cookie
  await attachSession(sessionId, signal)
  
  // Wait longer to ensure the cookie is persisted by the browser
  // This is critical for cross-origin requests with samesite="none"
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Try to select the archetype on the backend, but continue if it fails
  // The archetype can still be set through other means or defaults to warboss
  try {
    await selectArchetype(payload.archetypeId, signal)
  } catch (error) {
    // Log but don't throw - archetype selection is not critical for game start
    console.warn("Archetype selection failed, continuing with defaults:", error)
  }

  const [backendState, words] = await Promise.all([
    getSessionState(signal),
    safeGetNewWords(signal),
  ])

  const meta: SessionMeta = {
    sessionId,
    playerName: payload.playerName?.trim(),
    archetypeId: payload.archetypeId,
    words,
  }

  const state = adaptBackendSession({
    sessionId,
    backend: backendState,
    playerName: meta.playerName,
    archetypeId: payload.archetypeId,
    playerWords: words,
  })

  persistSessionMeta({
    ...meta,
    playerName: state.player.name,
    words: state.player.words,
  })

  return state
}

export async function fetchGameState(
  sessionId: string,
  signal?: AbortSignal,
): Promise<GameState> {
  if (!sessionId) {
    throw new ApiError("Missing session id", 400)
  }

  await attachSession(sessionId, signal)
  const backend = await getSessionState(signal)

  const meta = getSessionMeta(sessionId)
  const state = adaptBackendSession({
    sessionId,
    backend,
    playerName: meta?.playerName,
    archetypeId: meta?.archetypeId,
    playerWords: meta?.words,
    enemyWords: [],
  })

  persistSessionMeta({
    sessionId,
    playerName: state.player.name,
    archetypeId: state.player.id,
    words: state.player.words,
  })

  return state
}

export async function submitTurn(
  sessionId: string,
  payload: TurnRequest,
  signal?: AbortSignal,
): Promise<TurnResolution> {
  if (!sessionId) {
    throw new ApiError("Missing session id", 400)
  }

  await attachSession(sessionId, signal)

  const words = normalizeWords(payload.words ?? [])
  if (!words.length) {
    throw new ApiError("No words selected", 400)
  }
  const meta = getSessionMeta(sessionId)
  const previousBackendState = await getSessionState(signal)

  const command: Command = {
    action1: words[0] ?? "WAAGH",
    action2: words[1] ?? "SMASH",
    action3: words[2] ?? "DAKKA",
    player: meta?.playerName ?? "Warboss",
  }

  const [responseText, enemyResponseText] = await submitCommand(command, signal)
  const updatedBackendState = await waitForStateChange(
    previousBackendState.actions.length,
    signal,
  )

  const nextWords = payload.allowEnemySpeak === false ? words : await safeGetNewWords(signal)
  const enemyActions = updatedBackendState.actions.slice(previousBackendState.actions.length)
  
  // Try to extract enemy words from backend actions first, fall back to parsing response text
  let enemyWords: string[] = []
  if (payload.allowEnemySpeak !== false) {
    // Filter for enemy actions
    const enemyActionsOnly = enemyActions.filter((action) => action.actor === "enemy")
    if (enemyActionsOnly.length > 0) {
      enemyWords = actionsToWords(enemyActionsOnly)
    } else {
      // Fallback: derive from enemy response text if no actions recorded
      enemyWords = deriveEnemyWordsFromResponse(enemyResponseText)
    }
  }

  // Debug logging
  console.log("[submitTurn] Enemy action extraction:", {
    previousActionCount: previousBackendState.actions.length,
    updatedActionCount: updatedBackendState.actions.length,
    enemyActionsCount: enemyActions.length,
    enemyActions: enemyActions.map((a) => ({ name: a.name, actor: a.actor })),
    extractedEnemyWords: enemyWords,
    enemyResponseText,
    allowEnemySpeak: payload.allowEnemySpeak,
  })

  const previousState = adaptBackendSession({
    sessionId,
    backend: previousBackendState,
    playerName: meta?.playerName,
    archetypeId: meta?.archetypeId,
    playerWords: meta?.words,
  })

  const stateAfter = adaptBackendSession({
    sessionId,
    backend: updatedBackendState,
    playerName: previousState.player.name,
    archetypeId: previousState.player.id,
    playerWords: nextWords.length ? nextWords : previousState.player.words,
    enemyWords,
    previousState,
  })

  persistSessionMeta({
    sessionId,
    playerName: stateAfter.player.name,
    archetypeId: stateAfter.player.id,
    words: stateAfter.player.words,
    enemyName: stateAfter.enemy.name,
  })

  const resolution = buildTurnResolution({
    sessionId,
    responseText,
    enemyResponseText,
    usedWords: words,
    previousBackend: previousBackendState,
    updatedBackend: updatedBackendState,
    stateAfter,
    enemyWords,
  })

  return resolution
}

export async function fetchRewards(
  sessionId: string,
  signal?: AbortSignal,
): Promise<BuffChoice[]> {
  void signal
  void sessionId
  return []
}

export async function pickReward(
  sessionId: string,
  payload: PickBuffRequest,
  signal?: AbortSignal,
): Promise<GameState> {
  void payload
  return fetchGameState(sessionId, signal)
}

export async function endGame(sessionId: string, signal?: AbortSignal) {
  const state = await fetchGameState(sessionId, signal)
  const result = {
    finalScore: state.score,
    wavesCleared: state.wave,
    seed: state.seed,
  }
  return result
}
