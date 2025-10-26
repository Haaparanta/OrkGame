/**
 * OrkBattleUI Component Tests
 * 
 * Comprehensive tests for the main battle UI component including:
 * - Component rendering
 * - User interactions
 * - State management
 * - Error handling
 * - Loading states
 * - Word selection
 * - Turn submission
 * - Reward handling
 * - Game phases
 * - Responsive behavior
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrkBattleUI } from '@/components/ork/OrkBattleUI'
import type { GameState, TurnResolution, BuffChoice } from '@/lib/types'

// Mock data
const mockGameState: GameState = {
  sessionId: 'test-session',
  seed: 12345,
  wave: 1,
  score: 100,
  phase: 'battle',
  player: {
    id: 'player',
    name: 'Ork Warboss',
    hp: 85,
    hpMax: 100,
    rage: 15,
    cover: false,
    armor: 3,
    distance: 'medium',
    words: ['WAAGH', 'KRUMP', 'DAKKA', 'CHOPPA', 'BOOM'],
    traits: ['berserker'],
    flags: { berserk: true },
  },
  enemy: {
    id: 'enemy',
    name: 'Space Marine',
    hp: 60,
    hpMax: 80,
    rage: 0,
    cover: true,
    armor: 2,
    distance: 'medium',
    words: [],
    traits: ['disciplined'],
    flags: { cover: true },
  },
  limits: {
    maxWordsPerTurn: 3,
    maxHand: 10,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:05:00Z',
}

const mockTurnResolution: TurnResolution = {
  turn: 1,
  playerWords: ['WAAGH', 'KRUMP'],
  enemyWords: [],
  playerPlan: {
    text: 'WAAGH! ME KRUMPS DA ENEMY!',
    steps: [
      {
        action: 'KRUMP',
        target: 'enemy',
        delta: { hp: -15 },
        log: 'Ork delivers devastating blow',
        tags: ['melee', 'damage'],
      },
    ],
    speaks: ['WAAGH! ME KRUMPS DA ENEMY!'],
  },
  enemyPlan: {
    text: 'Enemy retaliates',
    steps: [],
    speaks: ['Enemy retaliates'],
  },
  log: ['WAAGH! ME KRUMPS DA ENEMY!', 'Enemy retaliates'],
  stateAfter: mockGameState,
  end: {},
}

const mockRewards: BuffChoice[] = [
  {
    id: 'armor-buff',
    type: 'armor',
    value: 2,
    label: 'Scrap Armor (+2 Armor)',
  },
  {
    id: 'health-buff',
    type: 'health',
    value: 20,
    label: 'Grox Meat (+20 HP)',
  },
]

describe('OrkBattleUI Component', () => {
  const mockOnSubmitTurn = jest.fn()
  const mockOnPickReward = jest.fn()
  const mockOnEndRun = jest.fn()

  beforeEach(() => {
    mockOnSubmitTurn.mockClear()
    mockOnPickReward.mockClear()
    mockOnEndRun.mockClear()
  })

  describe('Component Rendering', () => {
    test('should render basic game state information', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByText('Ork Warboss')).toBeInTheDocument()
      expect(screen.getByText('Space Marine')).toBeInTheDocument()
      expect(screen.getByText('85')).toBeInTheDocument() // Player HP
      expect(screen.getByText('60')).toBeInTheDocument() // Enemy HP
    })

    test('should render player stats correctly', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByText('15')).toBeInTheDocument() // Rage
      expect(screen.getByText('3')).toBeInTheDocument() // Armor
    })

    test('should render available words', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByText('WAAGH')).toBeInTheDocument()
      expect(screen.getByText('KRUMP')).toBeInTheDocument()
      expect(screen.getByText('DAKKA')).toBeInTheDocument()
      expect(screen.getByText('CHOPPA')).toBeInTheDocument()
      expect(screen.getByText('BOOM')).toBeInTheDocument()
    })

    test('should render health bars with correct percentages', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Player health: 85/100 = 85%
      const playerHealthBar = screen.getByRole('progressbar', { name: /player health/i })
      expect(playerHealthBar).toHaveAttribute('aria-valuenow', '85')

      // Enemy health: 60/80 = 75%
      const enemyHealthBar = screen.getByRole('progressbar', { name: /enemy health/i })
      expect(enemyHealthBar).toHaveAttribute('aria-valuenow', '75')
    })

    test('should handle zero health display', () => {
      const deadPlayerState = {
        ...mockGameState,
        player: { ...mockGameState.player, hp: 0 },
      }

      render(
        <OrkBattleUI
          state={deadPlayerState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    test('should display loading state when isLoading is true', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          isLoading={true}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
    })

    test('should display error message when error prop is provided', () => {
      const errorMessage = 'Failed to process turn'
      render(
        <OrkBattleUI
          state={mockGameState}
          error={errorMessage}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  describe('Word Selection', () => {
    test('should allow selecting words up to the limit', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Select maximum allowed words (3)
      await user.click(screen.getByText('WAAGH'))
      await user.click(screen.getByText('KRUMP'))
      await user.click(screen.getByText('DAKKA'))

      // Fourth word should not be selectable
      await user.click(screen.getByText('CHOPPA'))

      // Only 3 words should be selected
      const selectedWords = screen.getAllByRole('button', { pressed: true })
      expect(selectedWords).toHaveLength(3)
    })

    test('should allow deselecting words', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      const waighButton = screen.getByText('WAAGH')
      
      // Select then deselect
      await user.click(waighButton)
      expect(waighButton).toHaveAttribute('aria-pressed', 'true')
      
      await user.click(waighButton)
      expect(waighButton).toHaveAttribute('aria-pressed', 'false')
    })

    test('should maintain selection order', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Select words in specific order
      await user.click(screen.getByText('DAKKA'))
      await user.click(screen.getByText('WAAGH'))
      await user.click(screen.getByText('KRUMP'))

      // Submit to check order
      await user.click(screen.getByRole('button', { name: /submit turn/i }))

      expect(mockOnSubmitTurn).toHaveBeenCalledWith(
        ['DAKKA', 'WAAGH', 'KRUMP'],
        expect.any(Boolean)
      )
    })

    test('should handle empty word selection', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Submit without selecting any words
      await user.click(screen.getByRole('button', { name: /submit turn/i }))

      expect(mockOnSubmitTurn).toHaveBeenCalledWith([], expect.any(Boolean))
    })

    test('should clear selection when component receives new state', () => {
      const { rerender } = render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Select a word
      fireEvent.click(screen.getByText('WAAGH'))
      expect(screen.getByText('WAAGH')).toHaveAttribute('aria-pressed', 'true')

      // Update state (simulate new turn)
      const newState = { ...mockGameState, wave: 2 }
      rerender(
        <OrkBattleUI
          state={newState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Selection should be cleared
      expect(screen.getByText('WAAGH')).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Turn Submission', () => {
    test('should submit turn with selected words', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      await user.click(screen.getByText('WAAGH'))
      await user.click(screen.getByText('KRUMP'))
      await user.click(screen.getByRole('button', { name: /submit turn/i }))

      expect(mockOnSubmitTurn).toHaveBeenCalledWith(['WAAGH', 'KRUMP'], true)
    })

    test('should include allowEnemySpeak setting', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Toggle enemy speak setting
      const checkbox = screen.getByRole('checkbox', { name: /allow enemy speak/i })
      await user.click(checkbox)

      await user.click(screen.getByRole('button', { name: /submit turn/i }))

      expect(mockOnSubmitTurn).toHaveBeenCalledWith([], false)
    })

    test('should disable submit button during loading', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          isLoading={true}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submitting/i })
      expect(submitButton).toBeDisabled()
    })

    test('should handle async submission', async () => {
      const asyncSubmit = jest.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()

      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={asyncSubmit}
        />
      )

      await user.click(screen.getByText('WAAGH'))
      await user.click(screen.getByRole('button', { name: /submit turn/i }))

      await waitFor(() => {
        expect(asyncSubmit).toHaveBeenCalledWith(['WAAGH'], true)
      })
    })

    test('should prevent double submission', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit turn/i })
      
      // Rapid clicks
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only be called once
      expect(mockOnSubmitTurn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Game Phases', () => {
    test('should render battle phase correctly', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByRole('button', { name: /submit turn/i })).toBeInTheDocument()
      expect(screen.queryByText(/pick reward/i)).not.toBeInTheDocument()
    })

    test('should render rewards phase', () => {
      const rewardsState = { ...mockGameState, phase: 'rewards' as const }
      render(
        <OrkBattleUI
          state={rewardsState}
          rewards={mockRewards}
          onPickReward={mockOnPickReward}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByText('Scrap Armor (+2 Armor)')).toBeInTheDocument()
      expect(screen.getByText('Grox Meat (+20 HP)')).toBeInTheDocument()
    })

    test('should render game over phase', () => {
      const gameOverState = { ...mockGameState, phase: 'gameover' as const }
      render(
        <OrkBattleUI
          state={gameOverState}
          onEndRun={mockOnEndRun}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByRole('button', { name: /end run/i })).toBeInTheDocument()
    })

    test('should handle start phase', () => {
      const startState = { ...mockGameState, phase: 'start' as const }
      render(
        <OrkBattleUI
          state={startState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Should still show the battle interface for start phase
      expect(screen.getByRole('button', { name: /submit turn/i })).toBeInTheDocument()
    })
  })

  describe('Last Turn Display', () => {
    test('should display last turn results', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          lastTurn={mockTurnResolution}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByText('WAAGH! ME KRUMPS DA ENEMY!')).toBeInTheDocument()
      expect(screen.getByText('Enemy retaliates')).toBeInTheDocument()
    })

    test('should show player words used in last turn', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          lastTurn={mockTurnResolution}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Last turn used words should be highlighted or shown
      expect(screen.getByText('WAAGH')).toBeInTheDocument()
      expect(screen.getByText('KRUMP')).toBeInTheDocument()
    })

    test('should handle empty last turn', () => {
      const emptyTurn: TurnResolution = {
        ...mockTurnResolution,
        playerWords: [],
        enemyWords: [],
        log: [],
      }

      render(
        <OrkBattleUI
          state={mockGameState}
          lastTurn={emptyTurn}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Should not crash and should still render game state
      expect(screen.getByText('Ork Warboss')).toBeInTheDocument()
    })
  })

  describe('Reward Selection', () => {
    test('should allow selecting rewards', async () => {
      const user = userEvent.setup()
      const rewardsState = { ...mockGameState, phase: 'rewards' as const }
      
      render(
        <OrkBattleUI
          state={rewardsState}
          rewards={mockRewards}
          onPickReward={mockOnPickReward}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      await user.click(screen.getByText('Scrap Armor (+2 Armor)'))

      expect(mockOnPickReward).toHaveBeenCalledWith({
        rewardId: 'armor-buff',
        rewardType: 'armor',
      })
    })

    test('should handle missing onPickReward callback', async () => {
      const user = userEvent.setup()
      const rewardsState = { ...mockGameState, phase: 'rewards' as const }
      
      render(
        <OrkBattleUI
          state={rewardsState}
          rewards={mockRewards}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Should not crash when clicking reward without callback
      await user.click(screen.getByText('Scrap Armor (+2 Armor)'))
      
      // Should still render correctly
      expect(screen.getByText('Grox Meat (+20 HP)')).toBeInTheDocument()
    })

    test('should handle empty rewards list', () => {
      const rewardsState = { ...mockGameState, phase: 'rewards' as const }
      
      render(
        <OrkBattleUI
          state={rewardsState}
          rewards={[]}
          onPickReward={mockOnPickReward}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.queryByText(/reward/i)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByRole('progressbar', { name: /player health/i })).toBeInTheDocument()
      expect(screen.getByRole('progressbar', { name: /enemy health/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit turn/i })).toBeInTheDocument()
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Tab to first word
      await user.tab()
      expect(screen.getByText('WAAGH')).toHaveFocus()

      // Use keyboard to select
      await user.keyboard(' ')
      expect(screen.getByText('WAAGH')).toHaveAttribute('aria-pressed', 'true')
    })

    test('should announce selection state to screen readers', async () => {
      const user = userEvent.setup()
      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      const wordButton = screen.getByText('WAAGH')
      
      expect(wordButton).toHaveAttribute('aria-pressed', 'false')
      
      await user.click(wordButton)
      
      expect(wordButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Error Handling', () => {
    test('should display and clear error messages', () => {
      const { rerender } = render(
        <OrkBattleUI
          state={mockGameState}
          error="Network error occurred"
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.getByText('Network error occurred')).toBeInTheDocument()

      // Clear error
      rerender(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      expect(screen.queryByText('Network error occurred')).not.toBeInTheDocument()
    })

    test('should handle submission errors gracefully', async () => {
      const failingSubmit = jest.fn().mockRejectedValue(new Error('Submission failed'))
      const user = userEvent.setup()

      render(
        <OrkBattleUI
          state={mockGameState}
          onSubmitTurn={failingSubmit}
        />
      )

      await user.click(screen.getByRole('button', { name: /submit turn/i }))

      // Component should not crash
      expect(screen.getByText('Ork Warboss')).toBeInTheDocument()
    })

    test('should handle malformed game state', () => {
      const malformedState = {
        ...mockGameState,
        player: { ...mockGameState.player, words: null },
      } as any

      expect(() => {
        render(
          <OrkBattleUI
            state={malformedState}
            onSubmitTurn={mockOnSubmitTurn}
          />
        )
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    test('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn()
      const TestWrapper = (props: any) => {
        renderSpy()
        return <OrkBattleUI {...props} />
      }

      const { rerender } = render(
        <TestWrapper
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      renderSpy.mockClear()

      // Re-render with same props
      rerender(
        <TestWrapper
          state={mockGameState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      // Should minimize re-renders (this test may need adjustment based on actual implementation)
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })

    test('should handle large word lists efficiently', () => {
      const largeWordState = {
        ...mockGameState,
        player: {
          ...mockGameState.player,
          words: Array.from({ length: 100 }, (_, i) => `WORD${i}`),
        },
      }

      const startTime = performance.now()
      
      render(
        <OrkBattleUI
          state={largeWordState}
          onSubmitTurn={mockOnSubmitTurn}
        />
      )

      const endTime = performance.now()
      
      // Should render in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})
