'use client'

import { useMemo, useState } from "react"
import { Loader2, MessageCircle, Skull, Sparkles, Swords, Trophy, User } from "lucide-react"

import type {
  BuffChoice,
  GameState,
  PickBuffRequest,
  Role,
  TurnResolution,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const ROLE_OPTIONS: Role[] = [
  "ranged",
  "melee",
  "explosive",
  "defense",
  "utility",
  "fire",
  "ultimate",
]

const ROLE_LABELS: Record<Role, string> = {
  ranged: "Ranged",
  melee: "Melee",
  explosive: "Explosive",
  defense: "Defense",
  utility: "Utility",
  fire: "Fire",
  ultimate: "Ultimate",
}

interface OrkBattleUIProps {
  state: GameState
  lastTurn?: TurnResolution
  rewards?: BuffChoice[]
  error?: string
  isLoading?: boolean
  onSubmitTurn: (words: string[], allowEnemySpeak: boolean) => Promise<void> | void
  onPickReward?: (payload: PickBuffRequest) => Promise<void> | void
  onEndRun?: () => Promise<void> | void
}

interface WordToken {
  id: string
  word: string
  index: number
}

export function OrkBattleUI({
  state,
  lastTurn,
  rewards,
  error,
  isLoading,
  onSubmitTurn,
  onPickReward,
  onEndRun,
}: OrkBattleUIProps) {
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
  const [allowEnemySpeak, setAllowEnemySpeak] = useState(true)
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false)
  const [endingRun, setEndingRun] = useState(false)

  const maxWords = state.limits.maxWordsPerTurn
  const phase = state.phase

  const wordTokens = useMemo<WordToken[]>(
    () =>
      state.player.words.map((word, index) => ({
        id: `${word}-${index}`,
        word,
        index,
      })),
    [state.player.words],
  )

  const idToWord = useMemo(
    () => new Map(wordTokens.map((token) => [token.id, token.word])),
    [wordTokens],
  )

  const selectionOrder = useMemo(
    () =>
      selectedWordIds.reduce<Record<string, number>>((acc, id, index) => {
        acc[id] = index + 1
        return acc
      }, {}),
    [selectedWordIds],
  )

  const selectedWords = selectedWordIds
    .map((id) => idToWord.get(id))
    .filter((word): word is string => Boolean(word))

  const limitReached = selectedWordIds.length >= maxWords
  const hasWords = state.player.words.length > 0

  const toggleWord = (token: WordToken) => {
    setSelectedWordIds((current) => {
      if (current.includes(token.id)) {
        return current.filter((id) => id !== token.id)
      }
      if (current.length >= maxWords) {
        return current
      }
      return [...current, token.id]
    })
  }

  const clearSelection = () => {
    setSelectedWordIds([])
  }

  const handleSubmitTurn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedWords.length || isSubmittingTurn) return

    try {
      setIsSubmittingTurn(true)
      await onSubmitTurn(selectedWords, allowEnemySpeak)
      setSelectedWordIds([]) // Clear selection after turn
    } catch {
      // errors surface via the shared store; keep UI responsive
    } finally {
      setIsSubmittingTurn(false)
    }
  }

  const handleEndRun = async () => {
    if (!onEndRun || endingRun) return
    try {
      setEndingRun(true)
      await onEndRun()
    } finally {
      setEndingRun(false)
    }
  }

  if (phase === "rewards") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-stone-900 to-slate-800 p-6">
        <div className="mx-auto max-w-4xl">
          <RewardsPanel
            rewards={rewards}
            isLoading={isLoading}
            onPick={onPickReward}
          />
        </div>
      </div>
    )
  }

  if (phase === "gameover") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-stone-900 to-slate-800 p-6">
        <div className="mx-auto max-w-4xl">
          <GameOverPanel
            state={state}
            onEndRun={onEndRun}
            endingRun={endingRun}
            onClickEnd={handleEndRun}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-stone-900 to-slate-800">
      {/* Header Bar */}
      <div className="border-b border-primary/20 bg-card/80 backdrop-blur px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Skull className="size-6 text-primary" />
              <span className="text-lg font-bold uppercase tracking-wider text-primary">
                Wave {state.wave}
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">{state.enemy.name}</div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-center">
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">Score</span>
              <span className="text-lg font-bold text-primary">{state.score.toLocaleString()}</span>
            </div>
            <div className="rounded-lg border border-primary/20 bg-secondary/20 px-4 py-2 text-center">
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">Phase</span>
              <span className="text-sm font-bold uppercase tracking-wider text-accent">{phase}</span>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-muted-foreground/30 bg-muted/20 px-3 py-2">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Syncing...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-3">
          <div className="mx-auto max-w-7xl text-sm text-destructive">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Main Battle Layout */}
      <div className="mx-auto max-w-7xl p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr_1fr]">
          
          {/* Player Side - Left */}
          <div className="space-y-6">
            <CharacterCard 
              character={state.player} 
              title="Your Ork" 
              isPlayer={true}
              playerName={state.player.name}
            />
            
            {phase === "battle" && hasWords && (
              <WordGrid
                words={wordTokens}
                selectedWordIds={selectedWordIds}
                selectionOrder={selectionOrder}
                onToggleWord={toggleWord}
                maxWords={maxWords}
                isPlayer={true}
                disabled={isSubmittingTurn || Boolean(isLoading)}
              />
            )}
          </div>

          {/* Chat/Combat Log - Center */}
          <div className="space-y-6">
            <BattleChatBox 
              lastTurn={lastTurn}
              selectedWords={selectedWords}
              maxWords={maxWords}
            />
            
            {phase === "battle" && (
              <form onSubmit={handleSubmitTurn} className="space-y-4">
                <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-card/60 backdrop-blur p-4">
                  <Checkbox
                    id="allow-enemy"
                    checked={allowEnemySpeak}
                    onCheckedChange={(checked) => setAllowEnemySpeak(checked !== false)}
                    disabled={isSubmittingTurn || Boolean(isLoading)}
                  />
                  <label htmlFor="allow-enemy" className="text-sm text-muted-foreground">
                    Let enemy respond (better combat logs)
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!selectedWords.length || isSubmittingTurn || Boolean(isLoading) || !hasWords}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                  >
                    {isSubmittingTurn ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        WAAAGHING...
                      </>
                    ) : (
                      <>
                        <Swords className="mr-2 size-4" />
                        ATTACK! ({selectedWords.length}/{maxWords})
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearSelection}
                    disabled={!selectedWordIds.length || isSubmittingTurn || Boolean(isLoading)}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Enemy Side - Right */}
          <div className="space-y-6">
            <CharacterCard 
              character={state.enemy} 
              title="Enemy Ork" 
              isPlayer={false}
            />
            
            {lastTurn?.enemyWords && (
              <WordGrid
                words={lastTurn.enemyWords.map((word, index) => ({
                  id: `enemy-${word}-${index}`,
                  word,
                  index,
                }))}
                selectedWordIds={lastTurn.enemyWords.map((word, index) => `enemy-${word}-${index}`)}
                selectionOrder={lastTurn.enemyWords.reduce((acc, word, index) => {
                  acc[`enemy-${word}-${index}`] = index + 1
                  return acc
                }, {} as Record<string, number>)}
                onToggleWord={() => {}} // Enemy words are not interactive
                maxWords={3}
                isPlayer={false}
                disabled={true}
                title="Enemy's Last Attack"
              />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

interface ActorCardProps {
  title: string
  combatant: GameState["player"]
  alignment: "player" | "enemy"
}

function ActorCard({ title, combatant, alignment }: ActorCardProps) {
  const hpPercent =
    combatant.hpMax > 0 ? Math.max(0, Math.min(100, (combatant.hp / combatant.hpMax) * 100)) : 0

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{title}</span>
          <span
            className={cn(
              "text-sm font-medium",
              alignment === "player" ? "text-primary" : "text-destructive",
            )}
          >
            {combatant.name}
          </span>
        </CardTitle>
        <CardDescription className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {combatant.distance} range
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>HP</span>
            <span className="font-semibold text-foreground">
              {combatant.hp}/{combatant.hpMax}
            </span>
          </div>
          <Progress value={hpPercent} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatBadge label="Rage" value={combatant.rage} />
          <StatBadge label="Ammo" value={combatant.ammo} />
          <StatBadge label="Damage" value={`${combatant.damageMod.toFixed(2)}×`} />
          <StatBadge label="Armor" value={combatant.armor} />
          <StatBadge label="Cover" value={combatant.cover ? "Yes" : "No"} />
          <StatBadge label="Words" value={combatant.words.length} />
        </div>

        {combatant.traits.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Traits
            </span>
            <div className="flex flex-wrap gap-1.5">
              {combatant.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded border border-muted-foreground/30 px-2 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-muted-foreground/20 bg-muted/10 px-2 py-1 text-center">
      <span className="block text-[0.6rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

function LastTurnCard({ resolution }: { resolution?: TurnResolution }) {
  if (!resolution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Combat log</CardTitle>
          <CardDescription>Resolve a turn to populate the action log.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have not resolved any turns yet. Pick your words and hit the button to see the
            interpreter in action.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { playerPlan, enemyPlan, log, end } = resolution

  const verdict = end?.enemyDefeated
    ? "Enemy defeated — rewards unlocked!"
    : end?.playerDefeated
      ? "Defeat! Wrap up or start a fresh run."
      : "Both orks still scrapping."

  return (
    <Card className="flex flex-col gap-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Turn {resolution.turn} recap</CardTitle>
        <CardDescription>{verdict}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PlanSummary label="You yelled" words={resolution.playerWords} plan={playerPlan} />
        <PlanSummary label="Enemy yelled" words={resolution.enemyWords} plan={enemyPlan} />
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Log
          </h4>
          {log.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {log.map((line, index) => (
                <li
                  key={`${index}-${line}`}
                  className="rounded border border-muted-foreground/20 bg-muted/20 px-3 py-2 text-muted-foreground"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No log entries were returned.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface PlanSummaryProps {
  label: string
  words: string[]
  plan?: TurnResolution["playerPlan"]
}

function PlanSummary({ label, words, plan }: PlanSummaryProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        <span>{label}</span>
        <div className="flex flex-wrap gap-1.5">
          {words.length ? (
            words.map((word, index) => (
              <span
                key={`${word}-${index}`}
                className="rounded-full border border-muted-foreground/20 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
              >
                {word}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>
      {plan?.text ? (
        <p className="text-sm text-foreground">{plan.text}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No plan details were returned.</p>
      )}
      {plan?.steps?.length ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {plan.steps.map((step, index) => (
            <li
              key={`${step.action}-${index}`}
              className="rounded border border-muted-foreground/20 bg-muted/10 px-3 py-2"
            >
              <span className="font-semibold text-foreground">{step.action}</span> → {step.log}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

// Rewards Panel Component
interface RewardsPanelProps {
  rewards?: BuffChoice[]
  isLoading?: boolean
  onPick?: (payload: PickBuffRequest) => Promise<void> | void
}

function RewardsPanel({ rewards, isLoading, onPick }: RewardsPanelProps) {
  const [localError, setLocalError] = useState<string | null>(null)
  const [customWord, setCustomWord] = useState<string>("")
  const [customRole, setCustomRole] = useState<Role>(ROLE_OPTIONS[0])
  const [pendingChoice, setPendingChoice] = useState<string | null>(null)

  const handlePick = async (choice: BuffChoice) => {
    let payload: PickBuffRequest

    // Custom word handling
    if (choice.id === "buff-addword") {
      const normalized = customWord.trim().toUpperCase()
      if (!normalized) {
        setLocalError("Enter a custom word before submitting.")
        return
      }
      if (!/^[A-Z]{1,12}$/.test(normalized)) {
        setLocalError("Word must be 1–12 uppercase letters (A–Z).")
        return
      }
      payload = {
        choiceId: choice.id,
        customWord: {
          key: normalized,
          label: normalized,
          role: customRole,
          tags: [],
          cost: {},
          meta: {},
        },
      }
    } else {
      payload = { choiceId: choice.id }
    }

    try {
      setPendingChoice(choice.id)
      await onPick?.(payload)
      if (choice.id === "buff-addword") {
        setCustomWord("")
      }
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message)
      } else {
        setLocalError("Failed to submit reward choice.")
      }
    } finally {
      setPendingChoice(null)
    }
  }

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur">
      <CardHeader className="border-b border-primary/20">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Sparkles className="size-6 text-primary" />
          Victory Spoils
        </CardTitle>
        <CardDescription>Choose your reward and prepare for the next wave.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {localError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {localError}
          </div>
        )}
        {isLoading && !rewards ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Fetching rewards...
          </div>
        ) : rewards && rewards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {rewards.map((choice) => {
              const isCustom = choice.id === "buff-addword"
              const isPending = pendingChoice === choice.id
              return (
                <div
                  key={choice.id}
                  className="flex flex-col gap-3 rounded-lg border border-muted-foreground/20 bg-muted/10 px-4 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {choice.label}
                      </span>
                      <span className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                        {choice.type}
                      </span>
                    </div>
                    {typeof choice.value !== "undefined" && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {choice.value > 0 ? `+${choice.value}` : choice.value}
                      </span>
                    )}
                  </div>

                  {isCustom ? (
                    <div className="flex flex-col gap-3">
                      <Input
                        placeholder="DAKKA"
                        value={customWord}
                        onChange={(event) => setCustomWord(event.target.value)}
                        disabled={isPending || Boolean(isLoading)}
                      />
                      <Select
                        value={customRole}
                        onValueChange={(value) => setCustomRole(value as Role)}
                        disabled={isPending || Boolean(isLoading)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <Button
                    onClick={() => handlePick(choice)}
                    disabled={isPending || Boolean(isLoading)}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Claiming…
                      </>
                    ) : (
                      <>Claim reward</>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Rewards not available yet. Resolve a battle turn to unlock them.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface GameOverPanelProps {
  state: GameState
  onEndRun?: () => Promise<void> | void
  onClickEnd: () => Promise<void>
  endingRun: boolean
}

function GameOverPanel({ state, onEndRun, onClickEnd, endingRun }: GameOverPanelProps) {
  return (
    <Card className="flex flex-col gap-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Skull className="size-6 text-destructive" />
          You are scrap!
        </CardTitle>
        <CardDescription>
          Record your score with the backend to finish the session and return to the start screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <ScoreBadge label="Score" value={state.score.toLocaleString()} />
          <ScoreBadge label="Waves" value={state.wave} />
          <ScoreBadge label="Seed" value={state.seed} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={onClickEnd}
            disabled={!onEndRun || endingRun}
            variant="destructive"
            className="flex items-center gap-2"
          >
            {endingRun ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Recording score…
              </>
            ) : (
              <>
                <Trophy className="size-4" />
                Record score & return
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            This POSTs to /game/{state.sessionId}/end. Skip if you want to inspect the final state.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreBadge({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-muted-foreground/20 bg-muted/10 px-3 py-2">
      <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  )
}

function AwaitingStartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Waiting for session</CardTitle>
        <CardDescription>
          No active battle yet. Head back to the start screen and launch a run.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

// Character Card Component
interface CharacterCardProps {
  character: GameState["player"]
  title: string
  isPlayer: boolean
  playerName?: string
}

function CharacterCard({ character, title, isPlayer, playerName }: CharacterCardProps) {
  const hpPercent = character.hpMax > 0 ? Math.max(0, Math.min(100, (character.hp / character.hpMax) * 100)) : 0
  const themeClass = isPlayer ? "border-blue-500/30 bg-blue-500/5" : "border-red-500/30 bg-red-500/5"
  const accentColor = isPlayer ? "text-blue-400" : "text-red-400"

  return (
    <Card className={cn("border-2", themeClass)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPlayer ? (
              <User className={cn("size-6", accentColor)} />
            ) : (
              <Skull className={cn("size-6", accentColor)} />
            )}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className={cn("text-sm font-semibold", accentColor)}>
                {playerName || character.name}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Avatar Display */}
        <div className="flex justify-center">
          <div className={cn(
            "size-24 rounded-xl border-2 p-2",
            isPlayer ? "border-blue-500/50 bg-blue-500/10" : "border-red-500/50 bg-red-500/10"
          )}>
            {isPlayer ? (
              <>
                <img 
                  src={`/ork-avatar-${character.id}.png`}
                  alt={`${character.name} avatar`}
                  className="h-full w-full rounded-lg object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <div className="hidden flex h-full w-full items-center justify-center rounded-lg bg-muted/20">
                  <User className={cn("size-8", accentColor)} />
                </div>
              </>
            ) : (
              <>
                <img 
                  src="/ork-avatar-enemy.png"
                  alt="Enemy ork avatar"
                  className="h-full w-full rounded-lg object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <div className="hidden flex h-full w-full items-center justify-center rounded-lg bg-muted/20">
                  <Skull className={cn("size-8", accentColor)} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* HP Bar */}
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Health</span>
            <span className="font-semibold">{character.hp}/{character.hpMax}</span>
          </div>
          <Progress value={hpPercent} className="mt-1" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatBadge label="Rage" value={character.rage} />
          <StatBadge label="Ammo" value={character.ammo} />
          <StatBadge label="Damage" value={`${character.damageMod.toFixed(1)}×`} />
          <StatBadge label="Armor" value={character.armor} />
        </div>
      </CardContent>
    </Card>
  )
}

// Word Grid Component
interface WordGridProps {
  words: WordToken[]
  selectedWordIds: string[]
  selectionOrder: Record<string, number>
  onToggleWord: (token: WordToken) => void
  maxWords: number
  isPlayer: boolean
  disabled?: boolean
  title?: string
}

function WordGrid({ 
  words, 
  selectedWordIds, 
  selectionOrder, 
  onToggleWord, 
  maxWords, 
  isPlayer, 
  disabled = false,
  title 
}: WordGridProps) {
  const themeClass = isPlayer ? "border-blue-500/30 bg-blue-500/5" : "border-red-500/30 bg-red-500/5"
  const selectedClass = isPlayer 
    ? "border-blue-500 bg-blue-500/20 text-blue-100" 
    : "border-red-500 bg-red-500/20 text-red-100"
  const unselectedClass = isPlayer
    ? "border-blue-500/30 text-blue-300 hover:border-blue-400 hover:bg-blue-500/10"
    : "border-red-500/30 text-red-300 hover:border-red-400 hover:bg-red-500/10"

  // Ensure we have exactly 9 slots (3x3 grid)
  const gridWords = [...words]
  while (gridWords.length < 9) {
    gridWords.push({ id: `empty-${gridWords.length}`, word: "", index: -1 })
  }
  gridWords.splice(9) // Keep only first 9

  return (
    <Card className={cn("border-2", themeClass)}>
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-center text-sm uppercase tracking-wider">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {gridWords.map((token, index) => {
            if (!token.word) {
              return (
                <div 
                  key={token.id}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10"
                />
              )
            }

            const isSelected = selectedWordIds.includes(token.id)
            const order = selectionOrder[token.id]
            const limitReached = selectedWordIds.length >= maxWords && !isSelected

            return (
              <button
                key={token.id}
                type="button"
                className={cn(
                  "aspect-square rounded-lg border-2 p-2 text-xs font-bold uppercase tracking-wider transition-all",
                  "flex flex-col items-center justify-center relative",
                  isSelected ? selectedClass : unselectedClass,
                  disabled || limitReached ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
                onClick={() => !disabled && !limitReached && onToggleWord(token)}
                disabled={disabled || limitReached}
              >
                <span className="text-center break-all">{token.word}</span>
                {isSelected && order && (
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {order}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Battle Chat Box Component
interface BattleChatBoxProps {
  lastTurn?: TurnResolution
  selectedWords: string[]
  maxWords: number
}

function BattleChatBox({ lastTurn, selectedWords, maxWords }: BattleChatBoxProps) {
  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur">
      <CardHeader className="border-b border-primary/20 pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-5 text-primary" />
          Battle Chat
        </CardTitle>
        <CardDescription>
          Combat exchanges and war cries
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-4 min-h-[200px] max-h-[400px] overflow-y-auto">
          
          {/* Current Selection Preview */}
          {selectedWords.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-[70%] rounded-lg bg-blue-600/20 border border-blue-500/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <User className="size-4 text-blue-400" />
                  <span className="text-xs text-blue-300">You (preparing)</span>
                </div>
                <p className="text-sm font-semibold">
                  {selectedWords.join(" → ")}
                  {selectedWords.length < maxWords && (
                    <span className="text-blue-300/60 ml-1">
                      (+ {maxWords - selectedWords.length} more)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Last Turn Messages */}
          {lastTurn && (
            <>
              {/* Player's Attack */}
              {lastTurn.playerWords && lastTurn.playerWords.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-lg bg-blue-600/20 border border-blue-500/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="size-4 text-blue-400" />
                      <span className="text-xs text-blue-300">You</span>
                    </div>
                    <p className="text-sm font-semibold">
                      {lastTurn.playerWords.join(" → ")}
                    </p>
                    {lastTurn.playerPlan?.text && (
                      <p className="text-xs text-blue-200 mt-1">
                        {lastTurn.playerPlan.text}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Enemy's Attack */}
              {lastTurn.enemyWords && lastTurn.enemyWords.length > 0 && (
                <div className="flex justify-end">
                  <div className="max-w-[70%] rounded-lg bg-red-600/20 border border-red-500/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Skull className="size-4 text-red-400" />
                      <span className="text-xs text-red-300">Enemy</span>
                    </div>
                    <p className="text-sm font-semibold">
                      {lastTurn.enemyWords.join(" → ")}
                    </p>
                    {lastTurn.enemyPlan?.text && (
                      <p className="text-xs text-red-200 mt-1">
                        {lastTurn.enemyPlan.text}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Combat Log */}
              {lastTurn.log && lastTurn.log.length > 0 && (
                <div className="space-y-2">
                  {lastTurn.log.map((logEntry, index) => (
                    <div key={index} className="text-center">
                      <div className="inline-block rounded-lg bg-muted/40 border border-muted-foreground/20 px-3 py-1">
                        <span className="text-xs text-muted-foreground">{logEntry}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Battle Result */}
              {lastTurn.end && (
                <div className="text-center">
                  <div className={cn(
                    "inline-block rounded-lg border px-4 py-2",
                    lastTurn.end.playerDefeated 
                      ? "bg-red-600/20 border-red-500/30 text-red-300"
                      : lastTurn.end.enemyDefeated
                      ? "bg-green-600/20 border-green-500/30 text-green-300"
                      : "bg-muted/40 border-muted-foreground/20 text-muted-foreground"
                  )}>
                    <span className="text-sm font-semibold">
                      {lastTurn.end.playerDefeated 
                        ? "You have been defeated!"
                        : lastTurn.end.enemyDefeated
                        ? "Enemy defeated!"
                        : "The battle continues..."
                      }
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Welcome Message */}
          {!lastTurn && selectedWords.length === 0 && (
            <div className="text-center">
              <div className="inline-block rounded-lg bg-muted/40 border border-muted-foreground/20 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Select your words and prepare for battle!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Combat messages will appear here
                </p>
              </div>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  )
}
