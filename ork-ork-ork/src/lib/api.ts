import {
  Archetype,
  ArchetypeListResponse,
  BuffChoice,
  EndResponse,
  GameState,
  PickBuffRequest,
  RewardsResponse,
  ScoreItem,
  ScoresResponse,
  StartGameRequest,
  StateResponse,
  TurnRequest,
  TurnResponse,
  TurnResolution,
} from "./types"

type QueryValue = string | number | boolean | undefined

const DEFAULT_BASE_URL = "http://localhost:8000/api/v1"
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_BASE_URL).replace(
  /\/$/,
  "",
)

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
  credentials,
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

  let response: Response

  try {
    response = await fetch(url, init)
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      0,
    )
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

    throw new ApiError(message, response.status, code, parsed)
  }

  const contentLength = response.headers.get("content-length")
  if (contentLength === "0" || response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function fetchArchetypes(signal?: AbortSignal): Promise<Archetype[]> {
  const { items } = await apiFetch<ArchetypeListResponse>({
    path: "/archetypes",
    signal,
  })
  return items
}

export async function startGame(
  payload: StartGameRequest,
  signal?: AbortSignal,
): Promise<GameState> {
  const { state } = await apiFetch<StateResponse>({
    path: "/game/start",
    method: "POST",
    body: payload,
    signal,
  })
  return state
}

export async function fetchGameState(
  sessionId: string,
  signal?: AbortSignal,
): Promise<GameState> {
  const { state } = await apiFetch<StateResponse>({
    path: `/game/${sessionId}`,
    signal,
  })
  return state
}

export async function submitTurn(
  sessionId: string,
  payload: TurnRequest,
  signal?: AbortSignal,
): Promise<TurnResolution> {
  const { resolution } = await apiFetch<TurnResponse>({
    path: `/game/${sessionId}/turn`,
    method: "POST",
    body: payload,
    signal,
  })
  return resolution
}

export async function fetchRewards(
  sessionId: string,
  signal?: AbortSignal,
): Promise<BuffChoice[]> {
  const { choices } = await apiFetch<RewardsResponse>({
    path: `/game/${sessionId}/rewards`,
    signal,
  })
  return choices
}

export async function pickReward(
  sessionId: string,
  payload: PickBuffRequest,
  signal?: AbortSignal,
): Promise<GameState> {
  const { state } = await apiFetch<StateResponse>({
    path: `/game/${sessionId}/rewards/pick`,
    method: "POST",
    body: payload,
    signal,
  })
  return state
}

export async function endGame(
  sessionId: string,
  signal?: AbortSignal,
): Promise<EndResponse> {
  return apiFetch<EndResponse>({
    path: `/game/${sessionId}/end`,
    method: "POST",
    signal,
  })
}

export async function fetchScores(
  limit?: number,
  signal?: AbortSignal,
): Promise<ScoreItem[]> {
  const { items } = await apiFetch<ScoresResponse>({
    path: "/scores",
    query: { limit },
    signal,
  })
  return items
}

export function getApiBaseUrl() {
  return API_BASE_URL
}
