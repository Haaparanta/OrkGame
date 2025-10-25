'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { OrkBattleUI } from "@/components/ork/OrkBattleUI"
import { useGameActions, useGameStore } from "@/lib/game"
import type { PickBuffRequest } from "@/lib/types"

export default function BattlePage() {
  const router = useRouter()
  const { state, lastTurn, rewards, isLoading, error } = useGameStore()
  const { playTurn, loadRewards, chooseReward, completeRun } = useGameActions()

  useEffect(() => {
    if (!state && !isLoading && process.env.NODE_ENV === "production") {
      router.replace("/")
    }
  }, [state, isLoading, router])

  useEffect(() => {
    if (!state?.sessionId) return
    if (state.phase === "rewards" && !rewards) {
      void loadRewards(state.sessionId).catch(() => {
        // error routed through store.error; no-op
      })
    }
  }, [state?.sessionId, state?.phase, rewards, loadRewards])

  const handleSubmitTurn = async (words: string[], allowEnemySpeak: boolean) => {
    console.log('BattlePage handleSubmitTurn called', { words, allowEnemySpeak, state })
    if (!state) {
      console.log('No state available, returning early')
      return
    }
    try {
      console.log('Calling playTurn with sessionId:', state.sessionId)
      await playTurn(state.sessionId, { words, allowEnemySpeak })
      console.log('playTurn completed successfully')
    } catch (error) {
      console.error('playTurn failed:', error)
      // error propagated to store.error
    }
  }

  const handlePickReward = async (payload: PickBuffRequest) => {
    if (!state) return
    try {
      await chooseReward(state.sessionId, payload)
    } catch {
      // handled by store.error
    }
  }

  const handleEndRun = async () => {
    const sessionId = state?.sessionId
    if (!sessionId) return
    try {
      await completeRun(sessionId)
    } finally {
      router.replace("/")
    }
  }

  if (!state) {
    // In development mode, show mock data for UI testing
    if (process.env.NODE_ENV === "development") {
      const mockState = {
        sessionId: "mock-session",
        seed: 12345,
        phase: "battle" as const,
        wave: 1,
        score: 150,
        limits: {
          maxWordsPerTurn: 3,
          maxHand: 9,
        },
        player: {
          id: "warboss",
          name: "GROKK DA STOMPA",
          hp: 85,
          hpMax: 100,
          rage: 3,
          ammo: 8,
          cover: false,
          damageMod: 1.2,
          armor: 2,
          distance: "melee" as const,
          words: ["WAAGH", "SMASH", "BOOM", "CHARGE", "DAKKA", "SHOOT", "BURN", "FIXIT", "COVER"],
          traits: ["tough", "aggressive"],
          flags: {},
        },
        enemy: {
          id: "enemy",
          name: "SKARFANG DA BRUTAL",
          hp: 70,
          hpMax: 80,
          rage: 2,
          ammo: 5,
          cover: true,
          damageMod: 1.0,
          armor: 1,
          distance: "close" as const,
          words: ["KRUMP", "STOMP", "ROAR", "SLASH", "DODGE", "BLOCK", "RAGE", "HUNT", "STRIKE"],
          traits: ["sneaky"],
          flags: {},
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      return (
        <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 pb-16 pt-12">
          <OrkBattleUI
            state={mockState}
            lastTurn={undefined}
            rewards={undefined}
            error={undefined}
            isLoading={false}
            onSubmitTurn={handleSubmitTurn}
            onPickReward={handlePickReward}
            onEndRun={handleEndRun}
          />
        </main>
      )
    }

    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p>Loading session…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 pb-16 pt-12">
      <OrkBattleUI
        state={state}
        lastTurn={lastTurn}
        rewards={rewards}
        error={error}
        isLoading={isLoading}
        onSubmitTurn={handleSubmitTurn}
        onPickReward={handlePickReward}
        onEndRun={handleEndRun}
      />
    </main>
  )
}
