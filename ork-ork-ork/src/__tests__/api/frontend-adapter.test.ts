/**
 * Frontend Adapter API Tests
 * 
 * Tests for the frontend adapter functions that bridge the gap between
 * the simple backend API and the complex frontend expectations:
 * - startGame
 * - fetchGameState
 * - submitTurn
 * - fetchRewards
 * - pickReward
 * - endGame
 * - fetchArchetypes
 * 
 * Each test function has 5+ test cases covering success, error, and edge cases.
 */

import {
  startGame,
  fetchGameState,
  submitTurn,
  fetchRewards,
  pickReward,
  endGame,
  fetchArchetypes,
  ApiError,
} from '@/lib/api'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Frontend Adapter API Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
  })

  describe('startGame', () => {
    const mockPayload = {
      archetypeId: 'warboss',
      seed: 12345,
      randomWords: 5,
    }

    test('should start a new game successfully', async () => {
      // Mock the attach session call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Session attached successfully' }),
        headers: new Map([['content-length', '40']]),
      })

      const result = await startGame(mockPayload)

      expect(result).toMatchObject({
        sessionId: expect.stringMatching(/^session_\d+$/),
        seed: 12345,
        wave: 1,
        score: 0,
        phase: 'battle',
        player: expect.objectContaining({
          id: 'player',
          name: 'Ork Warboss',
          hp: 100,
          hpMax: 100,
          words: ['WAAGH', 'KRUMP', 'DAKKA'],
        }),
        enemy: expect.objectContaining({
          id: 'enemy',
          name: 'Enemy',
          hp: 100,
          hpMax: 100,
        }),
      })
    })

    test('should handle network errors during game start', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(startGame(mockPayload)).rejects.toThrow(ApiError)
    })

    test('should generate unique session IDs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Session attached successfully' }),
        headers: new Map([['content-length', '40']]),
      })

      const result1 = await startGame(mockPayload)
      const result2 = await startGame(mockPayload)

      expect(result1.sessionId).not.toBe(result2.sessionId)
    })

    test('should handle empty payload gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Session attached successfully' }),
        headers: new Map([['content-length', '40']]),
      })

      const result = await startGame({})

      expect(result).toMatchObject({
        sessionId: expect.any(String),
        player: expect.objectContaining({
          words: ['WAAGH', 'KRUMP', 'DAKKA'],
        }),
      })
    })

    test('should include proper timestamps', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Session attached successfully' }),
        headers: new Map([['content-length', '40']]),
      })

      const beforeStart = new Date()
      const result = await startGame(mockPayload)
      const afterStart = new Date()

      const createdAt = new Date(result.createdAt)
      const updatedAt = new Date(result.updatedAt)

      expect(createdAt).toBeInstanceOf(Date)
      expect(updatedAt).toBeInstanceOf(Date)
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime())
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterStart.getTime())
    })

    test('should handle abort signal', async () => {
      const controller = new AbortController()
      const signal = controller.signal

      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Request aborted'))
          })
          controller.abort()
        })
      })

      await expect(startGame(mockPayload, signal)).rejects.toThrow('Request aborted')
    })
  })

  describe('fetchGameState', () => {
    const sessionId = 'test-session-123'
    const mockBackendState = {
      name: sessionId,
      currenthealth: 85,
      maxhealth: 100,
      armor: 3,
      rage: 15,
      enemycurrenthealth: 60,
      enemymaxhealth: 80,
      actions: [],
    }

    test('should fetch and convert game state successfully', async () => {
      // Mock getCurrentSession
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '16']]),
      })

      // Mock getSessionState
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendState,
        headers: new Map([['content-length', '200']]),
      })

      const result = await fetchGameState(sessionId)

      expect(result).toMatchObject({
        sessionId,
        player: expect.objectContaining({
          hp: 85,
          hpMax: 100,
          armor: 3,
          rage: 15,
        }),
        enemy: expect.objectContaining({
          hp: 60,
          hpMax: 80,
        }),
      })
    })

    test('should create new session when none exists', async () => {
      // Mock getCurrentSession returning null
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null,
        headers: new Map([['content-length', '4']]),
      })

      // Mock attachSession
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Session attached successfully' }),
        headers: new Map([['content-length', '40']]),
      })

      // Mock getSessionState
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendState,
        headers: new Map([['content-length', '200']]),
      })

      const result = await fetchGameState(sessionId)

      expect(result.sessionId).toBe(sessionId)
    })

    test('should handle corrupted session state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '16']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ corrupted: 'data' }),
        headers: new Map([['content-length', '20']]),
      })

      const result = await fetchGameState(sessionId)

      // Should provide default values when backend data is corrupted
      expect(result.player.hp).toBeDefined()
      expect(result.enemy.hp).toBeDefined()
    })

    test('should handle missing session ID', async () => {
      await expect(fetchGameState('')).resolves.toBeDefined()
    })

    test('should properly map all game state fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '16']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendState,
        headers: new Map([['content-length', '200']]),
      })

      const result = await fetchGameState(sessionId)

      expect(result).toHaveProperty('sessionId')
      expect(result).toHaveProperty('seed')
      expect(result).toHaveProperty('wave')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('phase')
      expect(result).toHaveProperty('player')
      expect(result).toHaveProperty('enemy')
      expect(result).toHaveProperty('limits')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')
    })
  })

  describe('submitTurn', () => {
    const sessionId = 'test-session'
    const mockPayload = {
      words: ['WAAGH', 'KRUMP', 'DAKKA'],
      allowEnemySpeak: true,
    }

    test('should submit turn successfully', async () => {
      const mockResponse = 'WAAGH! ME KRUMPS DA ENEMY!'

      // Mock submitCommand
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Map([['content-length', '26']]),
      })

      // Mock getSessionState
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 90,
          maxhealth: 100,
          armor: 0,
          rage: 5,
          enemycurrenthealth: 70,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      // Mock fetchGameState calls (getCurrentSession + getSessionState)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '12']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 90,
          maxhealth: 100,
          armor: 0,
          rage: 5,
          enemycurrenthealth: 70,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      const result = await submitTurn(sessionId, mockPayload)

      expect(result).toMatchObject({
        turn: 1,
        playerWords: ['WAAGH', 'KRUMP', 'DAKKA'],
        playerPlan: expect.objectContaining({
          text: mockResponse,
          speaks: [mockResponse],
        }),
        log: [mockResponse],
      })
    })

    test('should handle empty words gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'ME WAAGHS AT NOTHING!',
        headers: new Map([['content-length', '20']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '12']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      const result = await submitTurn(sessionId, { words: [] })

      expect(result.playerWords).toEqual([])
    })

    test('should handle backend command errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Command processing failed'))

      await expect(submitTurn(sessionId, mockPayload)).rejects.toThrow()
    })

    test('should provide default actions when words missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'DEFAULT WAAGH!',
        headers: new Map([['content-length', '14']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '12']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      const result = await submitTurn(sessionId, { words: undefined })

      // Should use default actions
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/command'),
        expect.objectContaining({
          body: JSON.stringify({
            action1: 'WAAGH',
            action2: 'KRUMP',
            action3: 'DAKKA',
            player: 'Warboss',
            enemy: 'Human',
          }),
        })
      )
    })

    test('should handle partial word arrays', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'PARTIAL WAAGH!',
        headers: new Map([['content-length', '15']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '12']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      const result = await submitTurn(sessionId, { words: ['ONLY_ONE'] })

      expect(result.playerWords).toEqual(['ONLY_ONE'])
    })
  })

  describe('fetchArchetypes', () => {
    test('should return predefined archetypes', async () => {
      const result = await fetchArchetypes()

      expect(result).toHaveLength(3)
      expect(result).toEqual([
        expect.objectContaining({
          id: 'warboss',
          name: 'Warboss',
          baseStats: expect.objectContaining({
            hp: 120,
            armor: 10,
            rage: 0,
          }),
          startingWords: ['WAAGH', 'KRUMP', 'BOSS'],
        }),
        expect.objectContaining({
          id: 'burna-boy',
          name: 'Burna Boy',
          baseStats: expect.objectContaining({
            hp: 80,
            armor: 5,
            rage: 0,
          }),
          startingWords: ['BURN', 'FIRE', 'ROAST'],
        }),
        expect.objectContaining({
          id: 'rokkit-boy',
          name: 'Rokkit Boy',
          baseStats: expect.objectContaining({
            hp: 90,
            armor: 0,
            rage: 0,
          }),
          startingWords: ['BOOM', 'ROKKIT', 'BLAST'],
        }),
      ])
    })

    test('should not require network calls', async () => {
      await fetchArchetypes()

      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('should handle abort signal gracefully', async () => {
      const controller = new AbortController()
      controller.abort()

      const result = await fetchArchetypes(controller.signal)

      expect(result).toHaveLength(3)
    })

    test('should return consistent data on multiple calls', async () => {
      const result1 = await fetchArchetypes()
      const result2 = await fetchArchetypes()

      expect(result1).toEqual(result2)
    })

    test('should include all required archetype fields', async () => {
      const result = await fetchArchetypes()

      result.forEach(archetype => {
        expect(archetype).toHaveProperty('id')
        expect(archetype).toHaveProperty('name')
        expect(archetype).toHaveProperty('description')
        expect(archetype).toHaveProperty('baseStats')
        expect(archetype).toHaveProperty('startingWords')
        expect(Array.isArray(archetype.startingWords)).toBe(true)
      })
    })
  })

  describe('fetchRewards', () => {
    test('should return empty rewards array', async () => {
      const result = await fetchRewards('any-session')

      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    test('should handle any session ID', async () => {
      const result1 = await fetchRewards('session-1')
      const result2 = await fetchRewards('session-2')

      expect(result1).toEqual([])
      expect(result2).toEqual([])
    })

    test('should not make network calls', async () => {
      await fetchRewards('test-session')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('should handle abort signal', async () => {
      const controller = new AbortController()
      controller.abort()

      const result = await fetchRewards('test-session', controller.signal)

      expect(result).toEqual([])
    })

    test('should handle empty session ID', async () => {
      const result = await fetchRewards('')

      expect(result).toEqual([])
    })
  })

  describe('pickReward', () => {
    const sessionId = 'test-session'
    const mockPayload = { rewardId: 'test-reward' }

    test('should return current game state after picking reward', async () => {
      // Mock getCurrentSession
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '12']]),
      })

      // Mock getSessionState
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      const result = await pickReward(sessionId, mockPayload)

      expect(result).toMatchObject({
        sessionId,
        player: expect.objectContaining({
          hp: 100,
          hpMax: 100,
        }),
      })
    })

    test('should handle any reward payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '12']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      const result = await pickReward(sessionId, { complexReward: { type: 'buff', value: 10 } })

      expect(result.sessionId).toBe(sessionId)
    })

    test('should handle network errors from fetchGameState', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(pickReward(sessionId, mockPayload)).rejects.toThrow()
    })

    test('should handle empty payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => sessionId,
        headers: new Map([['content-length', '12']]),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: sessionId,
          currenthealth: 100,
          maxhealth: 100,
          armor: 0,
          rage: 0,
          enemycurrenthealth: 100,
          enemymaxhealth: 100,
          actions: [],
        }),
        headers: new Map([['content-length', '100']]),
      })

      const result = await pickReward(sessionId, {})

      expect(result.sessionId).toBe(sessionId)
    })

    test('should handle abort signal', async () => {
      const controller = new AbortController()
      controller.abort()

      mockFetch.mockImplementationOnce(() => {
        return Promise.reject(new Error('Request aborted'))
      })

      await expect(pickReward(sessionId, mockPayload, controller.signal)).rejects.toThrow()
    })
  })

  describe('endGame', () => {
    test('should return final game statistics', async () => {
      const result = await endGame('any-session')

      expect(result).toEqual({
        finalScore: 100,
        wavesCleared: 1,
        seed: 12345,
      })
    })

    test('should not make network calls', async () => {
      await endGame('test-session')

      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('should handle any session ID', async () => {
      const result1 = await endGame('session-1')
      const result2 = await endGame('session-2')

      expect(result1).toEqual(result2)
    })

    test('should handle abort signal gracefully', async () => {
      const controller = new AbortController()
      controller.abort()

      const result = await endGame('test-session', controller.signal)

      expect(result).toEqual({
        finalScore: 100,
        wavesCleared: 1,
        seed: 12345,
      })
    })

    test('should return consistent statistics', async () => {
      const result = await endGame('test-session')

      expect(typeof result.finalScore).toBe('number')
      expect(typeof result.wavesCleared).toBe('number')
      expect(typeof result.seed).toBe('number')
      expect(result.finalScore).toBeGreaterThan(0)
      expect(result.wavesCleared).toBeGreaterThan(0)
    })
  })
})
