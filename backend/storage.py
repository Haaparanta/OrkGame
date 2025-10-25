from contextlib import asynccontextmanager
import os
from fastapi import Cookie, FastAPI, HTTPException, Request, status
from pydantic import BaseModel
from pydantic.type_adapter import TypeAdapter

STATE_FOLDER = os.environ.get("STATE_FOLDER", "./")


class GameSession(BaseModel):
    name: str
    health: int
    armor: int

    @classmethod
    def new_session(cls, name):
        return cls(name=name, health=100, armor=0)


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.state = read_state()
    yield


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
