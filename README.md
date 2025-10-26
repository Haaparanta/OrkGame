# ORK ORK ORK – A Tiny Roguelike Where EVERYBODY Is An Ork

WAAAGH! This is a fast, silly, and surprisingly tactical **word-combo battler** where
**both sides are orks**. Each turn you bark 1–3 ork-words (e.g., `SHOOT`, `CHARGE`, `BOOM`);
the interpreter resolves your combo into actions. The enemy ork does the same. Survive
waves, take juicy buffs, and stack dakka for a bigger WAAAGH.

---

## ⚔️ Core Loop

1. **Start View**
   - Pick one of **3 ork archetypes** (different base stats & traits).
   - Get a **random starting word pool** (9 words).

2. **Battle View**
   - Choose **up to 3 words** from your pool (words are selected from a bank of available actions).
   - **Both** you and the enemy ork **play** your actions.
   - The backend interpreter processes actions and applies effects (damage, healing, armor/rage modifiers).
   - MCP (Model Context Protocol) powers AI-driven enemy decisions and Ork-speech narration.
   - End of turn → damage applied → next round or defeat screen.

3. **Next Wave**
   - A **meaner ork** spawns (more HP, more damage, nastier combos).
   - Keep going until you’re scrap.

4. **Scoring**
   - **Score = total damage dealt** across the run (+ small wave bonus).

---

## 🧠 Design Pillars

- **All green**: player, enemies — all orks, all loud.
- **Server-authoritative**: all damage calculations happen server-side; no client-side lies via MCP agents.
- **AI-powered narratives**: MCP-driven Ork speech and enemy decision-making for immersion and replayability.
- **Fast runs**: snackable sessions with meaningful progression.

---

## 🧪 Archetypes (pick one)

- **Warboss** – Boss of the WAAAGH! (350 HP, 3 armor, 1 rage) — durable leader with balanced stats.
- **Rokkit Boy** – Unstable explosives expert (150 HP, 1 armor, 3 rage) — low armor, high burst.
- **Burna Boy** – Flame-loving pyromaniac (250 HP, 2 armor, 2 rage) — keeps the fight hot.

> Enemies are procedurally generated with varying stats and roles.

---

## 🔤 Words & Combos

The game uses **action words** mapped to in-game abilities:

- **SHOOT_ROCKET** – Ranged burst (0–50 damage, 40% hit chance)
- **RAGE_UP** – Boost damage multiplier
- **PATCH_UP** – Self-heal (50 HP)
- **CHARGE** – Melee attack with high-damage burst (50 damage, 75% hit chance) but self-damage risk (10–20)
- **THROW_GRANADE** – Explosive attack (25 damage, 70% hit chance)
- **FIRE_FLAMETHROWER** – High-risk/high-reward attack (100 damage OR 100 self-damage, 90% hit chance)
- **ARMOR_UP** – Increase armor defense
- **OMNIBOOST** – Combo action (gain armor + rage + heal 50)

**Combat mechanics:**
- Damage is modified by armor and rage multipliers
- Player armor/rage >= 1 (cannot drop below)
- On failed attacks, lose armor/rage stacks
- Server resolves all damage calculations (no client-side lies)

---

## 🏗️ Tech Stack

### Backend
- **FastAPI** – Modern async Python web framework
- **MCP (Model Context Protocol)** – AI-driven battle logic and narrative generation
- **LangChain** + **LangGraph** – Agent orchestration for AI decision-making
- **OpenAI** – LLM for word generation and Ork speech
- **Pydantic** – Data validation and serialization

### Frontend
- **Next.js 16** – React meta-framework with server and client components
- **TypeScript** – Type-safe development
- **Tailwind CSS 4** – Utility-first styling
- **Radix UI** – Accessible component primitives
- **Framer Motion** – Smooth animations
- **Lucide React** – Icon library

### Deployment
- **Docker** – Containerization
- **Docker Compose** – Multi-service orchestration
- **NGINX** – Reverse proxy and load balancing

---

## 🚀 Getting Started

### Prerequisites
- Python 3.13+
- Node.js 20+
- Docker & Docker Compose (optional)

### Local Development

**Backend:**
```bash
cd backend
pip install -e .  # or use `uv pip install -e .`
python -m backend  # runs on http://localhost:8000
```

**Frontend:**
```bash
cd ork-ork-ork
pnpm install
pnpm dev  # runs on http://localhost:3000
```

### Docker Compose
```bash
docker-compose -f docker-compose.dev.yaml up
```

---

## 📡 API Endpoints

- `GET /session-state` – Fetch current game session state
- `POST /command` – Submit a battle action; returns Ork speech narration
- `GET /new-words-player` – Generate fresh action words
- `GET /archetypes` – Fetch available character archetypes

---

## 📚 Project Structure

```
OrkGame/
├── backend/                 # FastAPI app + MCP agents
│   ├── api.py              # Main FastAPI endpoints
│   ├── action.py           # Action definitions & effects
│   ├── storage.py          # Game session persistence
│   ├── enemy.py            # Enemy AI (MCP-powered)
│   ├── mcp_server.py       # MCP server implementation
│   └── mcp_client.py       # MCP client (LangChain adapter)
├── ork-ork-ork/            # Next.js frontend
│   ├── src/app/            # Pages & routes
│   │   ├── page.tsx        # Start/archetype selection
│   │   └── battle/page.tsx # Battle UI
│   ├── src/components/     # React components
│   └── src/lib/            # Utilities & API client
└── nginx.conf              # Reverse proxy config
```

---
