# ORK ORK ORK – FastAPI ICD (Interface Control Document)

This ICD specifies the **FastAPI** backend for the ork-only roguelike (Start + Battle views).  
It aligns with the previous game design but adopts **FastAPI** conventions, Pydantic models, and standard OpenAPI docs.

---

## 0) Overview

- **Framework:** FastAPI (Pydantic v2)
- **Base URL:** `/api/v1`
- **Docs:**  
  - Swagger UI: `/docs`  
  - ReDoc: `/redoc`  
  - OpenAPI JSON: `/openapi.json`
- **Content-Type:** `application/json`
- **Auth:** None (prototype). Add JWT/Session later.
- **Server authority:** All combat calculations performed server-side.
- **Determinism:** All RNG seeded by `{seed, wave, turn}` for reproducible replays.

---

## 1) Enums

```text
Role:        ranged | melee | explosive | defense | utility | fire | ultimate
Distance:    melee | close | medium | far
Phase:       start | battle | rewards | gameover


⸻

2) Schemas (Pydantic)

Types below map 1:1 to FastAPI response models. Field defaults are illustrative.

# enums
from typing import Literal, List, Dict, Optional
Role = Literal["ranged","melee","explosive","defense","utility","fire","ultimate"]
Distance = Literal["melee","close","medium","far"]
Phase = Literal["start","battle","rewards","gameover"]

# core models
class Archetype(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    baseStats: dict  # {"hpMax": int, "damageMod": float, "armor": int, "ammo": int, "rage": int}
    startingWords: List[str]

class Word(BaseModel):
    key: str
    label: str
    role: Role
    tags: List[str] = []
    cost: Dict[str, int] = {}   # e.g., {"ammo":1, "rage":0}
    meta: Dict[str, str] = {}   # e.g., {"rarity":"common"}

class Combatant(BaseModel):
    id: str
    name: str
    hp: int
    hpMax: int
    rage: int
    ammo: int
    cover: bool = False
    damageMod: float = 1.0
    armor: int = 0
    distance: Distance = "medium"
    words: List[str]
    traits: List[str] = []
    flags: Dict[str, bool] = {}  # {"player": True}

class Limits(BaseModel):
    maxWordsPerTurn: int = 3
    maxHand: int = 12

class GameState(BaseModel):
    sessionId: str
    seed: int
    wave: int
    score: int
    phase: Phase
    player: Combatant
    enemy: Combatant
    limits: Limits
    createdAt: str
    updatedAt: str

class PlanStep(BaseModel):
    action: str                 # e.g., "shoot_rocket"
    target: str                 # "self" | "enemy"
    delta: Dict[str, int|bool]  # e.g., {"enemyHp":-28, "selfAmmo":-1, "enemyCover": False}
    log: str
    tags: List[str] = []

class Plan(BaseModel):
    text: str
    steps: List[PlanStep]
    speaks: List[str]           # normalized words emitted by the AI/log

class TurnResolution(BaseModel):
    turn: int
    playerWords: List[str]
    enemyWords: List[str]
    playerPlan: Plan
    enemyPlan: Plan
    log: List[str]
    stateAfter: GameState
    end: Dict[str, bool]        # {"enemyDefeated": bool, "playerDefeated": bool}

class BuffChoice(BaseModel):
    id: str                     # "buff-dmg-05" | "buff-hp-10" | "buff-maxwords-1" | "buff-addword"
    type: str                   # "damageMod" | "hpMax" | "maxWordsPerTurn" | "addWord"
    value: Optional[float|int] = None
    label: str

# requests
class StartGameReq(BaseModel):
    archetypeId: str
    seed: Optional[int] = None
    randomWords: int = 9

class TurnReq(BaseModel):
    words: List[str]            # 1..maxWordsPerTurn
    allowEnemySpeak: bool = True

class PickBuffReq(BaseModel):
    choiceId: str               # one of BuffChoice.id
    customWord: Optional[Word] = None  # required if choiceId == "buff-addword"

# responses
class StateResp(BaseModel):
    state: GameState

class ArchetypeListResp(BaseModel):
    items: List[Archetype]

class RewardsResp(BaseModel):
    choices: List[BuffChoice]

class TurnResp(BaseModel):
    resolution: TurnResolution

class EndResp(BaseModel):
    finalScore: int
    wavesCleared: int
    seed: int

class ScoreItem(BaseModel):
    name: str
    score: int
    waves: int
    seed: int
    date: str

class ScoresResp(BaseModel):
    items: List[ScoreItem]

class ErrorResp(BaseModel):
    error: str
    message: str


⸻

3) Endpoints (FastAPI)

3.1 GET /api/v1/archetypes

List available ork archetypes.
	•	200 OK → ArchetypeListResp

{
  "items": [
    {
      "id": "warboss",
      "name": "Warboss",
      "description": "Big HP, starts with WAAAGH!",
      "baseStats": { "hpMax":110, "damageMod":1.0, "armor":0, "ammo":2, "rage":1 },
      "startingWords": ["WAAGH","SMASH","COVER"]
    }
  ]
}


⸻

3.2 POST /api/v1/game/start

Start a new run.
	•	Request → StartGameReq
	•	200 OK → StateResp
	•	400 invalid_archetype

{
  "archetypeId": "warboss",
  "seed": 12345,
  "randomWords": 9
}


⸻

3.3 GET /api/v1/game/{sessionId}

Fetch current state.
	•	200 OK → StateResp
	•	404 session_not_found

⸻

3.4 POST /api/v1/game/{sessionId}/turn

Submit player words; enemy acts; resolve turn.
	•	Request → TurnReq
	•	200 OK → TurnResp
	•	400 invalid_word_selection (not in pool / wrong count)
	•	409 turn_already_resolved
	•	404 session_not_found

{
  "words": ["SHOOT","BOOM"],
  "allowEnemySpeak": true
}


⸻

3.5 GET /api/v1/game/{sessionId}/rewards

Get reward choices post-victory.
	•	200 OK → RewardsResp
	•	409 not_in_rewards_phase

⸻

3.6 POST /api/v1/game/{sessionId}/rewards/pick

Pick a reward or add a custom word.
	•	Request → PickBuffReq
	•	200 OK → StateResp (next wave ready)
	•	422 custom_word_invalid
	•	409 not_in_rewards_phase

Custom word example:

{
  "choiceId": "buff-addword",
  "customWord": { "key":"DAKKA","label":"DAKKA","role":"ranged","tags":[],"cost":{},"meta":{} }
}


⸻

3.7 POST /api/v1/game/{sessionId}/end

End run and record score.
	•	200 OK → EndResp

{ "finalScore": 720, "wavesCleared": 9, "seed": 12345 }


⸻

3.8 GET /api/v1/scores?limit=20

Leaderboard.
	•	200 OK → ScoresResp

⸻

4) WebSocket (optional)

GET /api/v1/ws/{sessionId}

Events (JSON frames):
	•	turn.resolved → TurnResolution
	•	state.updated → GameState
	•	rewards.available → BuffChoice[]
	•	game.over → { "finalScore": int, "wavesCleared": int, "seed": int }

⸻

5) Interpreter (internal)
	•	Route (internal-only): POST /api/v1/mcp/interpret
	•	Request:

{
  "message": ["WAAGH","SMASH"],
  "context": {
    "self": { /* Combatant */ },
    "enemy": { /* Combatant */ },
    "limits": { "maxWordsPerTurn": 3 },
    "wave": 3,
    "rng": { "seed": 12345, "turn": 7 }
  }
}

	•	Response:

{
  "plan": {
    "text": "Ork screams WAAAGH and smashes with fury!",
    "steps": [
      { "action": "rage_boost", "target": "self",  "delta": {"selfRage": 2},   "log": "Rage surges!" },
      { "action": "melee_hit",  "target": "enemy", "delta": {"enemyHp": -22}, "log": "SMASH hits for 22 dmg!" }
    ],
    "speaks": ["WAAGH","SMASH"]
  }
}

Implementation note: The interpreter must be deterministic given {seed, wave, turn}.

⸻

6) Error Model & Status Codes

Error response (all 4xx/5xx):

{
  "error": "invalid_word_selection",
  "message": "Words must be 1..3 and belong to your pool."
}

Common errors:

HTTP	error	When
400	invalid_archetype	Unknown archetypeId
400	invalid_word_selection	Not in pool / wrong count
404	session_not_found	Bad sessionId
409	turn_already_resolved	Duplicate submission in same tick
409	not_in_rewards_phase	Rewards endpoint hit at wrong phase
422	custom_word_invalid	Fails regex/role/profanity/duplicate checks
500	interpreter_error	AI backend failure


⸻

7) Validation Rules
	•	Words/turn: 1..limits.maxWordsPerTurn (base 3, buffs can raise to 5).
	•	Exists in pool: all submitted words must exist in player.words.
	•	Custom word: ^[A-Z]{1,12}$, profanity filtered, role required; server normalizes key/label to uppercase.
	•	Damage/HP clamps: server clamps extremes; armor and cover apply before logs.

⸻

8) State Machine

start → battle → (win) → rewards → battle (wave+1)
                  └─(loss)→ gameover


⸻

9) Curl Examples

# list archetypes
curl -s http://localhost:8000/api/v1/archetypes

# start game
curl -s -X POST http://localhost:8000/api/v1/game/start \
  -H "Content-Type: application/json" \
  -d '{"archetypeId":"warboss","seed":12345,"randomWords":9}'

# submit turn
curl -s -X POST http://localhost:8000/api/v1/game/SESSION_ID/turn \
  -H "Content-Type: application/json" \
  -d '{"words":["SHOOT","BOOM"],"allowEnemySpeak":true}'

# get rewards
curl -s http://localhost:8000/api/v1/game/SESSION_ID/rewards

# pick buff
curl -s -X POST http://localhost:8000/api/v1/game/SESSION_ID/rewards/pick \
  -H "Content-Type: application/json" \
  -d '{"choiceId":"buff-dmg-05"}'


⸻

10) Deployment & Notes
	•	Uvicorn: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
	•	CORS: enable for your frontend origin.
	•	Persistence: prototype uses memory; swap to DB for scores/sessions.
	•	Rate limiting: protect /turn from spam (e.g., slow-loris or replay).

⸻

WAAAGH! Green iz best. This ICD locks the wire format for a FastAPI service that powers Start + Battle loops with deterministic AI resolution.

