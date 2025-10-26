/**
 * Backend API Tests
 * 
 * Tests for all backend API endpoints including:
 * - getCurrentSession
 * - getSessionState  
 * - getNewWordsPlayer
 * - submitCommand
 * - attachSession
 * 
 * Each test function has 5+ test cases covering:
 * - Success scenarios
 * - Error scenarios
 * - Edge cases
 * - Network failures
 * - Response validation
 */

import {
  getCurrentSession,
  getSessionState,
  getNewWordsPlayer,
  submitCommand,
  attachSession,
  ApiError,
  ApiLogger,
  getApiLogs,
  clearApiLogs,
} from '../../lib/api'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('Backend API Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    clearApiLogs()
    // Reset console.log and console.error to track API logging
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getCurrentSession', () => {
    test('should return session ID when session exists', async () => {
      const mockSessionId = 'test-session-123'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSessionId,
        headers: new Map([['content-length', '16']]),
      })

      const result = await getCurrentSession()

      expect(result).toBe(mockSessionId)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://orkgamez.serverlul.win/api/current-session',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      )
    })

    test('should return null when no session exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null,
        headers: new Map([['content-length', '4']]),
      })

      const result = await getCurrentSession()

      expect(result).toBeNull()
    })

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getCurrentSession()).rejects.toThrow(ApiError)
      await expect(getCurrentSession()).rejects.toHaveProperty('status', 0)
    })

    test('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Internal server error' }),
      })

      await expect(getCurrentSession()).rejects.toThrow(ApiError)
      await expect(getCurrentSession()).rejects.toHaveProperty('status', 500)
    })

    test('should log API calls', async () => {
      const mockSessionId = 'logged-session'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSessionId,
        headers: new Map([['content-length', '14']]),
      })

      await getCurrentSession()

      const logs = getApiLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        endpoint: 'getCurrentSession',
        method: 'GET',
        success: true,
      })
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

      await expect(getCurrentSession(signal)).rejects.toThrow('Request aborted')
    })
  })

  describe('getSessionState', () => {
    const mockGameSession = {
      name: 'test-session',
      currenthealth: 100,
      maxhealth: 100,
      armor: 5,
      rage: 10,
      enemycurrenthealth: 80,
      enemymaxhealth: 100,
      actions: [
        {
          name: 'WAAGH',
          actor: 'player' as const,
          effect: {
            self_heal: 0,
            self_damage: 0,
            gain_armor: 2,
            loose_armor: 0,
            gain_damage_boost: 5,
            loose_damage_boost: 0,
            enemy_heal: 0,
            enemy_damage: 15,
          },
        },
      ],
    }

    test('should return game session state successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockGameSession,
        headers: new Map([['content-length', '200']]),
      })

      const result = await getSessionState()

      expect(result).toEqual(mockGameSession)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://orkgamez.serverlul.win/api/session-state',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      )
    })

    test('should handle empty session state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Map([['content-length', '2']]),
      })

      const result = await getSessionState()

      expect(result).toEqual({})
    })

    test('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
        headers: new Map([['content-length', '10']]),
      })

      await expect(getSessionState()).rejects.toThrow()
    })

    test('should handle 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Session not found' }),
      })

      await expect(getSessionState()).rejects.toThrow(ApiError)
      await expect(getSessionState()).rejects.toHaveProperty('status', 404)
    })

    test('should validate game session structure', async () => {
      const invalidSession = { invalidField: 'test' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => invalidSession,
        headers: new Map([['content-length', '20']]),
      })

      const result = await getSessionState()

      // Should still return the data even if structure is unexpected
      expect(result).toEqual(invalidSession)
    })

    test('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'Unauthorized' }),
      })

      await expect(getSessionState()).rejects.toThrow(ApiError)
      await expect(getSessionState()).rejects.toHaveProperty('status', 401)
    })
  })

  describe('getNewWordsPlayer', () => {
    test('should return new Orkish words', async () => {
      const mockWords = 'WAAGH KRUMP DAKKA CHOPPA BOYZ STOMPA SHOOTA BURNA ROKKIT'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockWords,
        headers: new Map([['content-length', '55']]),
      })

      const result = await getNewWordsPlayer()

      expect(result).toBe(mockWords)
      expect(typeof result).toBe('string')
      expect(result.split(' ')).toHaveLength(9)
    })

    test('should handle empty words response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => '',
        headers: new Map([['content-length', '0']]),
      })

      const result = await getNewWordsPlayer()

      expect(result).toBe('')
    })

    test('should handle server timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(getNewWordsPlayer()).rejects.toThrow(ApiError)
      await expect(getNewWordsPlayer()).rejects.toHaveProperty('message', 'Request timeout')
    })

    test('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ message: 'Too many requests' }),
      })

      await expect(getNewWordsPlayer()).rejects.toThrow(ApiError)
      await expect(getNewWordsPlayer()).rejects.toHaveProperty('status', 429)
    })

    test('should validate word format', async () => {
      const mockWords = 'WAAGH KRUMP DAKKA'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockWords,
        headers: new Map([['content-length', '17']]),
      })

      const result = await getNewWordsPlayer()
      const words = result.split(' ')

      expect(words.every(word => word === word.toUpperCase())).toBe(true)
      expect(words.every(word => /^[A-Z]+$/.test(word))).toBe(true)
    })

    test('should handle non-string response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ words: ['WAAGH', 'KRUMP'] }),
        headers: new Map([['content-length', '30']]),
      })

      const result = await getNewWordsPlayer()

      // Should still return the data even if it's not a string
      expect(result).toEqual({ words: ['WAAGH', 'KRUMP'] })
    })
  })

  describe('submitCommand', () => {
    const mockCommand = {
      action1: 'WAAGH',
      action2: 'KRUMP',
      action3: 'DAKKA',
      player: 'Warboss',
      enemy: 'Human',
    }

    test('should submit battle command successfully', async () => {
      const mockResponse = 'WAAGH! ME KRUMPS DA HUMIE WIF BIG DAKKA! BOOM!'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Map([['content-length', '45']]),
      })

      const result = await submitCommand(mockCommand)

      expect(result).toBe(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://orkgamez.serverlul.win/api/command',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockCommand),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    test('should handle invalid command format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Invalid command format' }),
      })

      await expect(submitCommand(mockCommand)).rejects.toThrow(ApiError)
      await expect(submitCommand(mockCommand)).rejects.toHaveProperty('status', 400)
    })

    test('should handle empty command fields', async () => {
      const emptyCommand = {
        action1: '',
        action2: '',
        action3: '',
        player: '',
        enemy: '',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Empty command fields' }),
      })

      await expect(submitCommand(emptyCommand)).rejects.toThrow(ApiError)
    })

    test('should handle server processing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'AI processing failed' }),
      })

      await expect(submitCommand(mockCommand)).rejects.toThrow(ApiError)
      await expect(submitCommand(mockCommand)).rejects.toHaveProperty('status', 500)
    })

    test('should validate command structure', async () => {
      const invalidCommand = {
        action1: 'WAAGH',
        // Missing required fields
      } as any

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ message: 'Validation error' }),
      })

      await expect(submitCommand(invalidCommand)).rejects.toThrow(ApiError)
    })

    test('should handle long response text', async () => {
      const longResponse = 'WAAGH! '.repeat(100) + 'KRUMP!'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => longResponse,
        headers: new Map([['content-length', String(longResponse.length)]]),
      })

      const result = await submitCommand(mockCommand)

      expect(result).toBe(longResponse)
      expect(result.length).toBeGreaterThan(100)
    })
  })

  describe('attachSession', () => {
    test('should attach to session successfully', async () => {
      const sessionName = 'new-game-session'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Session attached successfully' }),
        headers: new Map([['content-length', '40']]),
      })

      await expect(attachSession(sessionName)).resolves.toBeUndefined()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://orkgamez.serverlul.win/api/attach-session',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ session_name: sessionName }),
        })
      )
    })

    test('should handle empty session name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'session_name is required' }),
      })

      await expect(attachSession('')).rejects.toThrow(ApiError)
      await expect(attachSession('')).rejects.toHaveProperty('status', 400)
    })

    test('should handle session name validation', async () => {
      const invalidSessionName = 'invalid/session*name'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Invalid session name format' }),
      })

      await expect(attachSession(invalidSessionName)).rejects.toThrow(ApiError)
    })

    test('should handle session creation conflicts', async () => {
      const sessionName = 'existing-session'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ message: 'Session already exists' }),
      })

      await expect(attachSession(sessionName)).rejects.toThrow(ApiError)
      await expect(attachSession(sessionName)).rejects.toHaveProperty('status', 409)
    })

    test('should handle very long session names', async () => {
      const longSessionName = 'a'.repeat(1000)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Session name too long' }),
      })

      await expect(attachSession(longSessionName)).rejects.toThrow(ApiError)
    })

    test('should handle special characters in session name', async () => {
      const specialSessionName = 'session-with-ümlauts-ånd-émojis-🎮'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Session attached successfully' }),
        headers: new Map([['content-length', '40']]),
      })

      await expect(attachSession(specialSessionName)).resolves.toBeUndefined()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ session_name: specialSessionName }),
        })
      )
    })
  })

  describe('ApiError', () => {
    test('should create ApiError with all properties', () => {
      const error = new ApiError('Test error', 400, 'TEST_ERROR', { extra: 'data' })

      expect(error.name).toBe('ApiError')
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.details).toEqual({ extra: 'data' })
    })

    test('should create ApiError with minimal properties', () => {
      const error = new ApiError('Simple error', 500)

      expect(error.name).toBe('ApiError')
      expect(error.message).toBe('Simple error')
      expect(error.status).toBe(500)
      expect(error.code).toBeUndefined()
      expect(error.details).toBeUndefined()
    })
  })

  describe('ApiLogger', () => {
    test('should log successful API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => 'test-result',
        headers: new Map([['content-length', '11']]),
      })

      await getCurrentSession()

      const logs = getApiLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        endpoint: 'getCurrentSession',
        method: 'GET',
        success: true,
        result: 'test-result',
      })
    })

    test('should log API errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      try {
        await getCurrentSession()
      } catch (error) {
        // Expected to throw
      }

      const logs = getApiLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        endpoint: 'getCurrentSession',
        method: 'GET',
        success: false,
        error: expect.objectContaining({
          message: 'Network error',
        }),
      })
    })

    test('should clear logs', () => {
      // Add a mock log first
      localStorage.setItem('orkgame_api_logs', JSON.stringify([{ test: 'log' }]))

      clearApiLogs()

      const logs = getApiLogs()
      expect(logs).toHaveLength(0)
    })
  })
})
