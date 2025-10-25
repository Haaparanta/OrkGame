import asyncio
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request, Response
from mcp.client.stdio import stdio_client
from mcp import ClientSession, StdioServerParameters

from .storage import (
    GameSession,
    save_session_state,
    storage_middleware,
    get_game_session,
    get_session_state,
    read_state,
)
from .ipc import delete_socket, ipc_server

from .mcp_client import Command, Chat


server_params = StdioServerParameters(
    command="python",
    args=["backend/mcp_server.py"],
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.state = read_state()
    ipc = asyncio.create_task(ipc_server(app.state.state))
    yield
    ipc.cancel()
    delete_socket()


app = FastAPI(lifespan=lifespan)
app.middleware("http")(storage_middleware)


@app.get("/current-session")
def current_session(session_id: str = Depends(get_game_session)):
    """Returns current session name"""
    return session_id


@app.get("/session-state")
def current_session_state(
    request: Request, state: GameSession = Depends(get_session_state)
) -> GameSession:
    """Get current game state"""
    save_session_state(request, state)
    return state

@app.get("/new-words-player")
def new_words_fetch():
    return Chat.get_new_words()

@app.post("/command")
async def command(
    command: Command, request: Request, state: GameSession = Depends(get_session_state)
):
    save_session_state(request, state)
    chad = Chat()
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()
            await chad.process_query(session=session, query=command.action1 + ', ' + command.action2 + ', ' + command.action3)
            save_session_state(request, state)
    return


@app.post("/attach-session")
def attach_session(response: Response, session_name: str):
    """Returns a cookie for session.

    Use this to bind to session and get use it's state in future requests.
    """
    response.set_cookie(key="game-session", value=session_name)
