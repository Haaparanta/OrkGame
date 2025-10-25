'use client'

import { useMemo, useState } from "react"
import { Loader2, Skull, Sparkles, Swords, Trophy } from "lucide-react"

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

  const phaseLabel = phase.toUpperCase()

  const mainCards: React.JSX.Element[] = []

  if (phase === "battle") {
    mainCards.push(
      <form key="battle-form" onSubmit={handleSubmitTurn} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Swords className="size-6 text-primary" />
              Pick your words ({selectedWords.length}/{maxWords})
            </CardTitle>
            <CardDescription>
              Word order matters — combos resolve left to right. Tap to queue, tap again to remove.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {hasWords ? (
                wordTokens.map((token) => {
                  const isSelected = selectedWordIds.includes(token.id)
                  const disabled = !isSelected && limitReached
                  const order = selectionOrder[token.id]
                  return (
                    <button
                      key={token.id}
                      type="button"
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-widest transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-muted-foreground/30 text-muted-foreground hover:border-primary/60 hover:text-primary",
                      )}
                      onClick={() => toggleWord(token)}
                      disabled={isSubmittingTurn || disabled || Boolean(isLoading)}
                    >
                      <span>{token.word}</span>
                      {isSelected && (
                        <span className="ml-2 text-xs text-primary/70">#{order}</span>
                      )}
                    </button>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Waiting on your starting pool from the server…
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow-enemy"
                  checked={allowEnemySpeak}
                  onCheckedChange={(checked) => setAllowEnemySpeak(checked !== false)}
                  disabled={isSubmittingTurn || Boolean(isLoading)}
                />
                <label htmlFor="allow-enemy" className="cursor-pointer">
                  Let the enemy shout their combo (better logs)
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span>Combo:</span>
                {selectedWords.length ? (
                  <span className="font-semibold text-foreground">
                    {selectedWords.join(" → ")}
                  </span>
                ) : (
                  <span>Select up to {maxWords} words</span>
                )}
              </div>
            </div>
          </CardContent>

          <CardContent className="border-t pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  disabled={
                    !selectedWords.length || isSubmittingTurn || Boolean(isLoading) || !hasWords
                  }
                >
                  {isSubmittingTurn ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Resolving turn…
                    </>
                  ) : (
                    <>Resolve turn</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearSelection}
                  disabled={!selectedWordIds.length || isSubmittingTurn || Boolean(isLoading)}
                >
                  Clear combo
                </Button>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Max {maxWords} words
              </span>
            </div>
          </CardContent>
        </Card>
      </form>,
    )
    mainCards.push(<LastTurnCard key="log" resolution={lastTurn} />)
  } else if (phase === "rewards") {
    mainCards.push(
      <RewardsPanel
        key="rewards"
        rewards={rewards}
        isLoading={isLoading}
        onPick={onPickReward}
      />,
    )
    mainCards.push(<LastTurnCard key="log" resolution={lastTurn} />)
  } else if (phase === "gameover") {
    mainCards.push(
      <GameOverPanel
        key="gameover"
        state={state}
        onEndRun={onEndRun}
        endingRun={endingRun}
        onClickEnd={handleEndRun}
      />,
    )
    mainCards.push(<LastTurnCard key="log" resolution={lastTurn} />)
  } else {
    mainCards.push(<AwaitingStartCard key="intro" />)
    mainCards.push(<LastTurnCard key="log" resolution={lastTurn} />)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Wave {state.wave}
          </p>
          <h2 className="text-2xl font-semibold text-foreground">{state.enemy.name}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border px-4 py-2 text-center">
            <span className="block text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
              Phase
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.3em]">
              {phaseLabel}
            </span>
          </div>
          <div className="rounded-lg border px-4 py-2 text-center">
            <span className="block text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
              Score
            </span>
            <span className="text-lg font-semibold text-foreground">
              {state.score.toLocaleString()}
            </span>
          </div>
          {isLoading && (
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Syncing…
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">{mainCards}</div>

        <div className="flex flex-col gap-6">
          <ActorCard title="You" combatant={state.player} alignment="player" />
          <ActorCard title="Enemy" combatant={state.enemy} alignment="enemy" />
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
    <div className="rounded-lg border border-muted-foreground/20 bg-muted/10 px-3 py-2">
      <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
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

interface RewardsPanelProps {
  rewards?: BuffChoice[]
  isLoading?: boolean
  onPick?: (payload: PickBuffRequest) => Promise<void> | void
}

function RewardsPanel({ rewards, isLoading, onPick }: RewardsPanelProps) {
  const [customWord, setCustomWord] = useState("")
  const [customRole, setCustomRole] = useState<Role>("ranged")
  const [pendingChoice, setPendingChoice] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string>()

  const handlePick = async (choice: BuffChoice) => {
    if (!onPick || pendingChoice) return
    setLocalError(undefined)

    let payload: PickBuffRequest = { choiceId: choice.id }

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
    }

    try {
      setPendingChoice(choice.id)
      await onPick(payload)
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
    <Card className="flex flex-col gap-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Sparkles className="size-6 text-primary" />
          Victory spoils
        </CardTitle>
        <CardDescription>Pick one reward to prep for the next wave.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {localError && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-100/30 px-3 py-2 text-xs text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
            {localError}
          </div>
        )}
        {isLoading && !rewards ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Fetching reward choices…
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
