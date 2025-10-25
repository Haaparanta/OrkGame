export type Role =
  | "ranged"
  | "melee"
  | "explosive"
  | "defense"
  | "utility"
  | "fire"
  | "ultimate"

export type Distance = "melee" | "close" | "medium" | "far"

export type Phase = "start" | "battle" | "rewards" | "gameover"

export interface Archetype {
  id: string
  name: string
  description?: string | null
  baseStats: Record<string, number>
  startingWords: string[]
}

export interface Word {
  key: string
  label: string
  role: Role
  tags: string[]
  cost: Record<string, number>
  meta: Record<string, string>
}

export interface Combatant {
  id: string
  name: string
  hp: number
  hpMax: number
  rage: number
  ammo: number
  cover: boolean
  damageMod: number
  armor: number
  distance: Distance
  words: string[]
  traits: string[]
  flags: Record<string, boolean>
}

export interface Limits {
  maxWordsPerTurn: number
  maxHand: number
}

export interface GameState {
  sessionId: string
  seed: number
  wave: number
  score: number
  phase: Phase
  player: Combatant
  enemy: Combatant
  limits: Limits
  createdAt: string
  updatedAt: string
}

export interface PlanStep {
  action: string
  target: string
  delta: Record<string, number | boolean>
  log: string
  tags: string[]
}

export interface Plan {
  text: string
  steps: PlanStep[]
  speaks: string[]
}

export interface TurnResolution {
  turn: number
  playerWords: string[]
  enemyWords: string[]
  playerPlan: Plan
  enemyPlan: Plan
  log: string[]
  stateAfter: GameState
  end: Record<string, boolean>
}

export interface BuffChoice {
  id: string
  type: string
  value?: number
  label: string
}

export interface StartGameRequest {
  archetypeId: string
  seed?: number
  randomWords?: number
}

export interface TurnRequest {
  words: string[]
  allowEnemySpeak?: boolean
}

export interface PickBuffRequest {
  choiceId: string
  customWord?: Word
}

export interface StateResponse {
  state: GameState
}

export interface ArchetypeListResponse {
  items: Archetype[]
}

export interface RewardsResponse {
  choices: BuffChoice[]
}

export interface TurnResponse {
  resolution: TurnResolution
}

export interface EndResponse {
  finalScore: number
  wavesCleared: number
  seed: number
}

export interface ScoreItem {
  name: string
  score: number
  waves: number
  seed: number
  date: string
}

export interface ScoresResponse {
  items: ScoreItem[]
}

export interface ErrorResponse {
  error: string
  message: string
}
