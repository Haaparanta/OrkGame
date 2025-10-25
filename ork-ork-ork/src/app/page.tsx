'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, RotateCcw, Skull, Swords } from "lucide-react"

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
  const [playerName, setPlayerName] = useState("")
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

    const payload: { archetypeId: string; playerName?: string } = {
      archetypeId: selectedArchetype,
    }

    if (playerName.trim()) {
      payload.playerName = playerName.trim()
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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-stone-900 to-slate-800">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-12">
        
        {/* Header Section */}
        <section className="flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-3">
              <Skull className="size-6 text-primary" />
              <span className="text-lg font-bold uppercase tracking-[0.3em] text-primary">
                ORK WARBAND ASSEMBLER
              </span>
              <Skull className="size-6 text-primary" />
            </div>
            <h1 className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-5xl font-black text-transparent sm:text-7xl">
              WAAAAAGH!
            </h1>
            <p className="max-w-3xl text-lg text-muted-foreground">
              Build your ork, name yourself, and prepare for brutal word-combo warfare. 
              Every shout matters when facing the endless green tide!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {hasActiveRun && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex items-center gap-2"
                onClick={() => router.push("/battle")}
                disabled={store.isLoading}
              >
                <RotateCcw className="size-5" />
                Return to Battle
              </Button>
            )}
            
            {/* Debug: Preview Battle UI button (temporary) */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex items-center gap-2 border-accent/50 text-accent hover:bg-accent/10"
              onClick={() => router.push("/battle")}
            >
              <Skull className="size-5" />
              Preview Battle UI
            </Button>
            
            <div className="rounded-lg border border-muted-foreground/30 bg-muted/20 px-4 py-2 text-sm">
              <span className="font-semibold text-accent">Status:</span>{" "}
              <span className="text-muted-foreground">
                {hasActiveRun ? "Battle in progress" : "Ready to deploy"}
              </span>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          
          {/* Character Creation Form */}
          <form onSubmit={handleStart} className="flex flex-col gap-6">
            <Card className="border-primary/20 bg-card/80 backdrop-blur">
              <CardHeader className="border-b border-primary/20">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Swords className="size-7 text-primary" />
                  Forge Your Ork
                </CardTitle>
                <CardDescription>
                  Every proper ork needs a fearsome name and a fighting style.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                
                {/* Player Name */}
                <div className="space-y-3">
                  <label htmlFor="player-name" className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Your Ork Name
                  </label>
                  <Input
                    id="player-name"
                    placeholder="GROKK DA STOMPA"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isBusy}
                    className="border-primary/30 bg-input/50 text-lg font-bold uppercase tracking-wide placeholder:text-muted-foreground/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Strike fear into your enemies with a proper ork name (optional)
                  </p>
                </div>

                {/* Archetype Selection */}
                <div className="space-y-3">
                  <label htmlFor="archetype" className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Fighting Style
                  </label>
                  <Select
                    value={selectedArchetype}
                    onValueChange={setSelectedArchetype}
                    disabled={loadingArchetypes || store.isLoading}
                  >
                    <SelectTrigger id="archetype" className="border-primary/30 bg-input/50 text-base font-semibold">
                      <SelectValue placeholder="Choose your path" />
                    </SelectTrigger>
                    <SelectContent className="border-primary/30 bg-popover/95 backdrop-blur">
                      {archetypes.map((archetype) => (
                        <SelectItem key={archetype.id} value={archetype.id} className="font-semibold">
                          {archetype.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingArchetypes && (
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Loading archetypes from the warp...
                    </span>
                  )}
                </div>

              </CardContent>

              <CardContent className="border-t border-primary/20 pt-6">
                <div className="space-y-4">
                  
                  {/* Error Messages */}
                  {store.error && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      <strong>Battle Error:</strong> {store.error}
                    </div>
                  )}

                  {fetchError && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-100/10 p-3 text-xs text-amber-300">
                      <strong>Warning:</strong> {fetchError}
                    </div>
                  )}

                  {/* Start Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-primary to-accent text-lg font-bold uppercase tracking-wider hover:from-primary/90 hover:to-accent/90"
                    disabled={!selectedArchetype || isBusy}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="mr-3 size-5 animate-spin" />
                        Entering the fray...
                      </>
                    ) : (
                      <>
                        <Skull className="mr-3 size-5" />
                        BEGIN THE WAAAGH!
                        <ArrowRight className="ml-3 size-5" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          {/* Character Preview */}
          <Card className="border-primary/20 bg-card/80 backdrop-blur">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="text-2xl text-primary">
                {activeArchetype?.name || "Select an Archetype"}
              </CardTitle>
              <CardDescription className="text-base">
                {activeArchetype?.description || "Choose your fighting style to see details"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              
              {/* Avatar Display */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="size-48 rounded-xl border-4 border-primary/30 bg-gradient-to-br from-muted/50 to-muted/20 p-4">
                    {activeArchetype ? (
                      <img 
                        src={`/ork-avatar-${activeArchetype.id}.png`}
                        alt={`${activeArchetype.name} avatar`}
                        className="h-full w-full rounded-lg object-cover"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`flex h-full w-full items-center justify-center rounded-lg bg-primary/10 ${activeArchetype ? 'hidden' : ''}`}>
                      <Skull className="size-16 text-primary/60" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-background bg-primary px-3 py-1">
                    <span className="text-xs font-bold text-primary-foreground">LVL 1</span>
                  </div>
                </div>
              </div>

              {/* Player Name Preview */}
              {playerName && (
                <div className="text-center">
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Your Name</p>
                  <p className="text-xl font-bold uppercase tracking-wide text-accent">{playerName}</p>
                </div>
              )}

              {/* Stats Grid */}
              {activeArchetype && (
                <div className="grid grid-cols-5 gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  {Object.entries(STAT_LABELS).map(([key, label]) => {
                    const value = activeArchetype.baseStats?.[key] ?? 0
                    const formatted = key === "damageMod" ? `${value.toFixed(1)}×` : Math.round(value).toString()
                    return (
                      <div key={key} className="text-center">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="text-lg font-bold text-primary">{formatted}</p>
                      </div>
                    )
                  })}
                </div>
              )}

            </CardContent>
          </Card>

        </section>
      </div>
    </main>
  )
}
