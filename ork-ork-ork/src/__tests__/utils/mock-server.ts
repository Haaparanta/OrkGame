/**
 * Mock Server Setup for API Testing
 * 
 * This file sets up Mock Service Worker (MSW) handlers for testing
 * the API endpoints without making real HTTP requests.
 */

import { http, HttpResponse } from 'msw'

const API_BASE = 'https://orkgamez.serverlul.win/api'

// Mock data
const mockGameSession = {
  name: 'test-session',
  currenthealth: 85,
  maxhealth: 100,
  armor: 3,
  rage: 15,
  enemycurrenthealth: 60,
  enemymaxhealth: 80,
  actions: [
    {
      name: 'WAAGH',
      actor: 'player',
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

const mockOrkWords = 'WAAGH KRUMP DAKKA CHOPPA BOYZ STOMPA SHOOTA BURNA ROKKIT'

export const handlers = [
  // GET /current-session
  http.get(`${API_BASE}/current-session`, ({ request }) => {
    const cookies = request.headers.get('cookie')
    if (cookies?.includes('game-session=test-session')) {
      return HttpResponse.json('test-session')
    }
    return HttpResponse.json(null)
  }),

  // GET /session-state
  http.get(`${API_BASE}/session-state`, ({ request }) => {
    const cookies = request.headers.get('cookie')
    if (cookies?.includes('game-session=')) {
      return HttpResponse.json(mockGameSession)
    }
    return HttpResponse.json({
      name: 'temp_session',
      currenthealth: 100,
      maxhealth: 100,
      armor: 0,
      rage: 0,
      enemycurrenthealth: 100,
      enemymaxhealth: 100,
      actions: [],
    })
  }),

  // GET /new-words-player
  http.get(`${API_BASE}/new-words-player`, () => {
    return HttpResponse.json(mockOrkWords)
  }),

  // POST /command
  http.post(`${API_BASE}/command`, async ({ request }) => {
    const body = await request.json() as any
    const { action1, action2, action3, player, enemy } = body

    // Simulate different responses based on input
    if (action1 === 'WAAGH' && action2 === 'KRUMP') {
      return HttpResponse.json('WAAGH! ME KRUMPS DA ENEMY WIF MIGHTY FORCE!')
    }
    
    if (action1 === 'DAKKA') {
      return HttpResponse.json('DAKKA DAKKA DAKKA! BULLETS EVERYWHERE!')
    }

    // Default response
    return HttpResponse.json(`${action1}! ${action2}! ${action3}! DA ${player.toUpperCase()} SMASHES DA ${enemy.toUpperCase()}!`)
  }),

  // POST /attach-session
  http.post(`${API_BASE}/attach-session`, async ({ request }) => {
    const body = await request.json() as any
    const { session_name } = body

    if (!session_name) {
      return HttpResponse.json(
        { message: 'session_name is required' },
        { status: 400 }
      )
    }

    if (session_name.length > 100) {
      return HttpResponse.json(
        { message: 'Session name too long' },
        { status: 400 }
      )
    }

    return HttpResponse.json(
      { message: 'Session attached successfully', session_name },
      {
        headers: {
          'Set-Cookie': `game-session=${session_name}; Path=/; HttpOnly; SameSite=Lax`,
        },
      }
    )
  }),

  // Error simulation handlers
  http.get(`${API_BASE}/error-test`, () => {
    return HttpResponse.json(
      { message: 'Simulated server error' },
      { status: 500 }
    )
  }),

  http.get(`${API_BASE}/timeout-test`, () => {
    return new Promise(() => {
      // Never resolves - simulates timeout
    })
  }),

  http.get(`${API_BASE}/network-error`, () => {
    return HttpResponse.error()
  }),

  // Rate limiting simulation
  http.get(`${API_BASE}/rate-limit-test`, () => {
    return HttpResponse.json(
      { message: 'Too many requests' },
      { status: 429 }
    )
  }),

  // Validation error simulation
  http.post(`${API_BASE}/validation-error`, () => {
    return HttpResponse.json(
      { 
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: {
          field: 'action1',
          issue: 'required'
        }
      },
      { status: 422 }
    )
  }),

  // Authentication error simulation
  http.get(`${API_BASE}/auth-error`, () => {
    return HttpResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }),

  // Not found error simulation
  http.get(`${API_BASE}/not-found`, () => {
    return HttpResponse.json(
      { message: 'Resource not found' },
      { status: 404 }
    )
  }),

  // Malformed JSON response
  http.get(`${API_BASE}/malformed-json`, () => {
    return new HttpResponse('{ invalid json }', {
      headers: { 'Content-Type': 'application/json' },
    })
  }),

  // Empty response
  http.get(`${API_BASE}/empty-response`, () => {
    return new HttpResponse('', {
      status: 204,
      headers: { 'Content-Length': '0' },
    })
  }),

  // Large response simulation
  http.get(`${API_BASE}/large-response`, () => {
    const largeData = {
      words: Array.from({ length: 1000 }, (_, i) => `WORD${i}`).join(' '),
      metadata: Array.from({ length: 100 }, (_, i) => ({ id: i, data: `data-${i}` })),
    }
    return HttpResponse.json(largeData)
  }),

  // Slow response simulation
  http.get(`${API_BASE}/slow-response`, async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return HttpResponse.json({ message: 'Slow response' })
  }),

  // Dynamic session state based on session ID
  http.get(`${API_BASE}/dynamic-session/:sessionId`, ({ params }) => {
    const { sessionId } = params
    return HttpResponse.json({
      ...mockGameSession,
      name: sessionId,
      currenthealth: sessionId === 'wounded-session' ? 25 : 100,
    })
  }),

  // Simulate different command responses
  http.post(`${API_BASE}/dynamic-command`, async ({ request }) => {
    const body = await request.json() as any
    const responses = {
      'BOOM': 'KABOOM! EVERYTHING EXPLODES!',
      'HEAL': 'DA ORK PATCHES HIMSELF UP!',
      'DEFEND': 'DA ORK RAISES HIS SHIELD!',
      'CHARGE': 'WAAAGH! DA ORK CHARGES FORWARD!',
    }
    
    const response = responses[body.action1 as keyof typeof responses] || 'DA ORK DOES SOMETHING!'
    return HttpResponse.json(response)
  }),

  // Simulate session conflicts
  http.post(`${API_BASE}/conflict-session`, () => {
    return HttpResponse.json(
      { message: 'Session already exists' },
      { status: 409 }
    )
  }),

  // Simulate partial content
  http.get(`${API_BASE}/partial-content`, () => {
    return HttpResponse.json(
      { words: 'WAAGH KRUMP' },
      { 
        status: 206,
        headers: { 'Content-Range': 'items 0-1/9' }
      }
    )
  }),
]

// Test utilities
export const createMockSession = (sessionId: string = 'test-session') => {
  return {
    sessionId,
    currenthealth: 100,
    maxhealth: 100,
    armor: 0,
    rage: 0,
    enemycurrenthealth: 100,
    enemymaxhealth: 100,
    actions: [],
  }
}

export const createMockCommand = (overrides: any = {}) => {
  return {
    action1: 'WAAGH',
    action2: 'KRUMP',
    action3: 'DAKKA',
    player: 'Warboss',
    enemy: 'Human',
    ...overrides,
  }
}

export const createMockGameState = (overrides: any = {}) => {
  return {
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
      ammo: 8,
      cover: false,
      damageMod: 5,
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
      ammo: 10,
      cover: true,
      damageMod: 0,
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
    ...overrides,
  }
}
