'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, RotateCcw, Sparkles, Swords } from "lucide-react"

import { fetchArchetypes } from "@/lib/api"
import { DEFAULT_WORD_LIBRARY, useGameActions, useGameStore } from "@/lib/game"
import type { Archetype } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STAT_LABELS: Record<string, string> = {
  hpMax: "HP",
  damageMod: "Damage",
  armor: "Armor",
  ammo: "Ammo",
  rage: "Rage",
}

const RANDOM_WORD_MIN = 6
const RANDOM_WORD_MAX = 12

const FALLBACK_ARCHETYPES: Archetype[] = [
  {
    id: "warboss",
    name: "Warboss",
    description: "Big boss with the loudest WAAGH. Heavy armor, steady dakka.",
    baseStats: { hpMax: 110, damageMod: 1, armor: 2, ammo: 2, rage: 1 },
    startingWords: ["WAAGH", "SMASH", "COVER"],
  },
  {
    id: "rokkit-boy",
    name: "Rokkit Boy",
    description: "Low HP, high boom. Shoots first, asks never.",
    baseStats: { hpMax: 80, damageMod: 1.3, armor: 0, ammo: 3, rage: 0 },
    startingWords: ["SHOOT", "BOOM", "COVER"],
  },
  {
    id: "burna-boy",
    name: "Burna Boy",
    description: "Fire solves most problems. Keeps zones molten.",
    baseStats: { hpMax: 95, damageMod: 0.95, armor: 1, ammo: 2, rage: 0 },
    startingWords: ["BURN", "CHARGE", "FIXIT"],
  },
]

export default function StartPage() {
  const router = useRouter()
  const store = useGameStore()
  const { startNewGame } = useGameActions()

  const [archetypes, setArchetypes] = useState<Archetype[]>(FALLBACK_ARCHETYPES)
  const [selectedArchetype, setSelectedArchetype] = useState<string | undefined>(
    FALLBACK_ARCHETYPES[0]?.id,
  )
  const [seedInput, setSeedInput] = useState("")
  const [randomWords, setRandomWords] = useState<number>(9)
  const [loadingArchetypes, setLoadingArchetypes] = useState(false)
  const [fetchError, setFetchError] = useState<string>()
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    let isMounted = true
    setLoadingArchetypes(true)

    fetchArchetypes()
      .then((items) => {
        if (!isMounted) return
        if (items.length > 0) {
          setArchetypes(items)
          setSelectedArchetype((current) => current ?? items[0]?.id)
        } else {
          setFetchError("No archetypes returned. Using fallback roster.")
        }
      })
      .catch(() => {
        if (!isMounted) return
        setFetchError("Unable to reach backend. Using fallback roster.")
      })
      .finally(() => {
        if (isMounted) {
          setLoadingArchetypes(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedArchetype && archetypes.length > 0) {
      setSelectedArchetype(archetypes[0].id)
    }
  }, [archetypes, selectedArchetype])

  const activeArchetype = useMemo(
    () => archetypes.find((item) => item.id === selectedArchetype) ?? archetypes[0],
    [archetypes, selectedArchetype],
  )

  const hasActiveRun = Boolean(store.state?.sessionId && store.state.phase !== "gameover")
  const isBusy = store.isLoading || isStarting

  const handleStart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedArchetype || isBusy) return

    const payload: { archetypeId: string; seed?: number; randomWords: number } = {
      archetypeId: selectedArchetype,
      randomWords,
    }

    const trimmedSeed = seedInput.trim()
    if (trimmedSeed) {
      const parsedSeed = Number.parseInt(trimmedSeed, 10)
      if (!Number.isNaN(parsedSeed)) {
        payload.seed = parsedSeed
      }
    }

    try {
      setIsStarting(true)
      await startNewGame(payload)
      router.push("/battle")
    } catch {
      // error bubbled through store.error
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12">
      <section className="flex flex-col gap-4 text-center sm:text-left">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em]">
            <Sparkles className="size-4 text-primary" />
            Prototype build
          </span>
          <h1 className="text-balance text-4xl font-semibold text-foreground sm:text-5xl">
            ORK ORK ORK – Word-Combo Battler
          </h1>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Draft an ork archetype, scream a 1–3 word combo, and let the interpreter turn it into
            carnage. Every enemy is an ork with their own playbook — survive waves, stack buffs, and
            chase the biggest WAAAGH score.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {hasActiveRun && (
            <Button
              type="button"
              variant="secondary"
              className="flex items-center gap-2"
              onClick={() => router.push("/battle")}
              disabled={store.isLoading}
            >
              <RotateCcw className="size-4" />
              Continue current run
            </Button>
          )}
          <div className="rounded-lg border px-4 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Server:</span>{" "}
            {hasActiveRun ? "Session active" : "Waiting to start"}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <form onSubmit={handleStart} className="flex flex-col gap-6">
          <Card className="flex flex-col gap-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Swords className="size-6 text-primary" />
                Assemble your warband
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Archetypes sync from the FastAPI backend. No backend? We fall back to a local roster
                so you can still prototype the flow.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="archetype" className="text-sm font-medium text-muted-foreground">
                  Archetype
                </label>
                <Select
                  value={selectedArchetype}
                  onValueChange={setSelectedArchetype}
                  disabled={loadingArchetypes || store.isLoading}
                >
                  <SelectTrigger id="archetype" className="w-full">
                    <SelectValue placeholder="Choose an ork" />
                  </SelectTrigger>
                  <SelectContent>
                    {archetypes.map((archetype) => (
                      <SelectItem key={archetype.id} value={archetype.id}>
                        {archetype.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingArchetypes && (
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Fetching roster…
                  </span>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="seed" className="text-sm font-medium text-muted-foreground">
                    Seed (optional)
                  </label>
                  <Input
                    id="seed"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="12345"
                    value={seedInput}
                    onChange={(event) => setSeedInput(event.target.value)}
                    disabled={isBusy}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pick a seed to replay runs. Leave blank for pure RNG.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span>Random word pool</span>
                    <span className="font-semibold text-foreground">{randomWords} words</span>
                  </div>
                  <Slider
                    min={RANDOM_WORD_MIN}
                    max={RANDOM_WORD_MAX}
                    value={[randomWords]}
                    onValueChange={(values) => setRandomWords(values[0] ?? randomWords)}
                    disabled={isBusy}
                  />
                  <p className="text-xs text-muted-foreground">
                    Baseline pool size before buffs. Rewards can add more later.
                  </p>
                </div>
              </div>
            </CardContent>

            <CardContent className="border-t pt-6">
              <div className="flex flex-col gap-3">
                {store.error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {store.error}
                  </div>
                )}

                {fetchError && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-100/20 px-3 py-2 text-xs text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
                    {fetchError}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="flex items-center justify-center gap-2"
                  disabled={!selectedArchetype || isBusy}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Spooling up…
                    </>
                  ) : (
                    <>
                      Start the WAAAGH
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <Card className="flex flex-col gap-6">
          <CardHeader className="pb-0">
            <CardTitle className="text-2xl">{activeArchetype?.name}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {activeArchetype?.description ??
                "Select an archetype to see its kit, stats, and starting words."}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3 rounded-lg border px-4 py-3 sm:grid-cols-5 sm:px-6">
              {Object.entries(STAT_LABELS).map(([key, label]) => {
                const value = activeArchetype?.baseStats?.[key] ?? 0
                const formatted =
                  key === "damageMod" ? `${value.toFixed(2)}×` : Math.round(value).toString()
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-lg font-semibold text-foreground">{formatted}</span>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Starting words
              </h2>
              <div className="flex flex-wrap gap-2">
                {(activeArchetype?.startingWords ?? []).map((word) => (
                  <span
                    key={word}
                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Global ork lexicon
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_WORD_LIBRARY.map((word) => (
                  <span
                    key={word}
                    className="rounded border border-dashed border-muted-foreground/30 px-2 py-1 text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground"
                  >
                    {word}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Server adds more words as rewards or enemy tech. This library helps designers keep
                tone consistent when running without the backend.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
