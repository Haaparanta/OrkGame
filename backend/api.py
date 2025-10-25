from fastapi import Depends, FastAPI, Request, Response
from mcp.client.stdio import stdio_client
from mcp import ClientSession, StdioServerParameters

from .storage import (
    GameSession,
    lifespan,
    save_session_state,
    storage_middleware,
    get_game_session,
    get_session_state,
)

server_params = StdioServerParameters(
    command="python",
    args=["backend/mcp_server.py"],
)

from .mcp_client import Command, Chat

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
async def command(
    command: Command, request: Request, state: GameSession = Depends(get_session_state)
):
    chad = Chat()
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()
            await chad.process_query(session=session, query=command.action1)
    return

@app.post("/attach-session")
def attach_session(response: Response, session_name: str):
    response.set_cookie(key="game-session", value=session_name)
