import enum
import os
from fastapi import Cookie, HTTPException, Request, status
from pydantic import BaseModel, Field
from pydantic.type_adapter import TypeAdapter

try:
    from .action import ActionEnum
except ImportError:
    from action import ActionEnum

STATE_FOLDER = os.environ.get("STATE_FOLDER", "./")


class Actor(enum.StrEnum):
    player = "player"
    enemy = "enemy"


class Action(BaseModel):
    name: ActionEnum
    actor: Actor


class GameSession(BaseModel):
    name: str
    currenthealth: int
    maxhealth: int
    armor: int
    rage: int
    enemycurrenthealth: int
    enemymaxhealth: int

    actions: list[Action] = Field(default_factory=list)

    @classmethod
    def new_session(cls, name):
        return cls(
            name=name,
            currenthealth=100,
            maxhealth=100,
            armor=0,
            rage=0,
            enemycurrenthealth=100,
            enemymaxhealth=100,
        )

    def act(self, action: ActionEnum):
        effect = action.effect()
        self.currenthealth = self.currenthealth + effect.self_heal - effect.self_damage
        self.armor = self.armor + effect.gain_armor - effect.loose_armor
        self.rage = self.rage + effect.gain_damage_boost - effect.loose_damage_boost
        self.enemycurrenthealth = (
            self.enemycurrenthealth + effect.enemy_heal - effect.enemy_damage
        )


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
