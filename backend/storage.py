import enum
import logging
import os
from fastapi import Cookie, HTTPException, Request, status
from pydantic import BaseModel, Field
from pydantic.type_adapter import TypeAdapter
import math


try:
    from .action import ActionEnum, Effect
    from .enemy import Enemy
except ImportError:
    from action import ActionEnum, Effect
    from enemy import Enemy

logger = logging.getLogger("uvicorn.error")

STATE_FOLDER = os.environ.get("STATE_FOLDER", "./")


class Actor(enum.StrEnum):
    player = "player"
    enemy = "enemy"


class Action(BaseModel):
    name: ActionEnum
    actor: Actor
    effect: Effect


class GameSession(BaseModel):
    name: str
    currenthealth: int
    maxhealth: int
    armor: int
    rage: int
    enemycurrenthealth: int
    enemymaxhealth: int
    enemyrage: int
    enemyarmor: int
    gameover: bool
    kills: int

    current_enemy: Enemy

    actions: list[Action] = Field(default_factory=list)

    @classmethod
    def new_session(cls, name):
        return cls(
            name=name,
            currenthealth=100,
            maxhealth=100,
            armor=1,
            rage=1,
            enemycurrenthealth=100,
            enemymaxhealth=100,
            enemyrage=1,
            enemyarmor=1,
            gameover=False,
            kills=0,
            current_enemy=Enemy(role="Loota"),
        )

    def act(self, action: str, player_turn: bool):
        action = ActionEnum(action)
        effect = action.effect()
        logger.info("Got effect: %s", effect)
        if (self.currenthealth + effect.self_heal) > (
            effect.self_damage * (1 / self.armor) * self.enemyrage
        ):
            self.currenthealth = math.ceil(
                self.currenthealth
                + effect.self_heal
                - (effect.self_damage * (1 / self.armor) * self.enemyrage)
            )
            if self.currenthealth > self.maxhealth:
                self.currenthealth = self.maxhealth
        else:
            self.currenthealth = 0
            self.gameover = True
        # Force to not be below 1
        if (self.armor + effect.gain_armor - effect.loose_armor) >= 1:
            self.armor = self.armor + effect.gain_armor - effect.loose_armor
        else:
            self.armor = 1
        # Do not go below 1
        if (self.rage + effect.gain_damage_boost - effect.loose_damage_boost) >= 1:
            self.rage = self.rage + effect.gain_damage_boost - effect.loose_damage_boost
        else:
            self.rage = 1

        if (self.enemycurrenthealth + effect.enemy_heal) > (
            (effect.enemy_damage * (1 / self.enemyarmor)) * self.rage
        ):
            self.enemycurrenthealth = math.ceil(
                self.enemycurrenthealth
                + effect.enemy_heal
                - (effect.enemy_damage * (1 / self.enemyarmor)) * self.rage
            )
            if self.enemycurrenthealth > self.enemymaxhealth:
                self.enemycurrenthealth = self.enemymaxhealth
        else:
            self.kills += 1
            self.enemycurrenthealth = 100 + (50 * self.kills)
            self.enemymax = 100 + (50 * self.kills)
            self.enemyrage = 1 + self.kills // 2
            self.enemyarmor = 1 + self.kills // 2
            self.maxhealth += 20

        self.actions.append(Action(name=action, actor=Actor.player, effect=effect))


SessionStorage = TypeAdapter(dict[str, GameSession])


def get_game_session(
    game_session: str | None = Cookie(default=None, alias="game-session"),
):
    """Dependency that retrieves the 'game-session' cookie value.

    Raises 401 if missing.
    """
    if game_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing 'game-session' cookie",
        )
    return game_session


def get_session_state(
    request: Request,
    game_session: str | None = Cookie(default=None, alias="game-session"),
) -> GameSession:
    session = get_game_session(game_session)
    state = request.app.state.state.get(session)
    if state is None:
        return GameSession.new_session(session)
    return state


def save_session_state(request: Request, session: GameSession):
    request.app.state.state[session.name] = session


async def storage_middleware(request: Request, call_next):
    response = await call_next(request)
    write_state(request.app.state.state)
    return response


def read_state():
    try:
        with open(f"{STATE_FOLDER}/state.json", "r") as f:
            data = f.read()
        return SessionStorage.validate_json(data)
    except Exception:
        return {}


def write_state(state: dict[str, GameSession]):
    with open(f"{STATE_FOLDER}/state.json", "wb+") as f:
        f.write(SessionStorage.dump_json(state))
