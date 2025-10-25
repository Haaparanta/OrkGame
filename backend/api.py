from fastapi import Depends, FastAPI, Request, Response

from .storage import (
    GameSession,
    lifespan,
    save_session_state,
    storage_middleware,
    get_game_session,
    get_session_state,
)

from .mcp_client import Command

app = FastAPI(lifespan=lifespan)
app.middleware("http")(storage_middleware)


@app.get("/current-session")
def current_session(session_id: str = Depends(get_game_session)):
    return session_id


@app.get("/session-state")
def current_session_state(
    request: Request, state: GameSession = Depends(get_session_state)
):
    save_session_state(request, state)
    return state


@app.post("/command")
def command(
    command: Command, request: Request, state: GameSession = Depends(get_session_state)
):
    pass


@app.post("/attach-session")
def attach_session(response: Response, session_name: str):
    response.set_cookie(key="game-session", value=session_name)
