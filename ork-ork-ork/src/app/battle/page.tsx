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
    if (!state && !isLoading) {
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
    if (!state) return
    try {
      await playTurn(state.sessionId, { words, allowEnemySpeak })
    } catch {
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
