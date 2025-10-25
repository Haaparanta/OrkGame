"""
Ork Game Battle API

This module provides the main FastAPI application for the Ork Game, handling
HTTP endpoints for game session management, battle commands, and state persistence.
The API serves as the main interface between the frontend and the game logic,
utilizing MCP (Model Context Protocol) for AI-driven battle interactions.
"""

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.

    Manages the startup and shutdown of the FastAPI application, including:
    - Loading game state from persistent storage on startup
    - Starting the IPC server for inter-process communication
    - Cleaning up resources on shutdown

    Args:
        app (FastAPI): The FastAPI application instance

    Yields:
        None: Control is yielded to the application runtime
    """
    app.state.state = read_state()
    ipc = asyncio.create_task(ipc_server(app.state.state))
    yield
    ipc.cancel()
    delete_socket()


app = FastAPI(lifespan=lifespan)
app.middleware("http")(storage_middleware)


@app.get("/current-session")
def current_session(session_id: str = Depends(get_game_session)):
    """
    Get the current game session identifier.

    Returns the session ID from the 'game-session' cookie. This endpoint
    is used to verify which session the client is currently bound to.

    Args:
        session_id (str): The session ID extracted from the cookie dependency

    Returns:
        str: The current session identifier

    Raises:
        HTTPException: 401 if no valid session cookie is present
    """
    return session_id


@app.get("/session-state")
def current_session_state(
    request: Request, state: GameSession = Depends(get_session_state)
) -> GameSession:
    """
    Get the current game session state.

    Retrieves the complete game state for the current session, including
    player health, armor, rage, enemy status, and action history. If no
    state exists for the session, creates a new session with default values.

    Args:
        request (Request): The HTTP request object
        state (GameSession): The current game session state from dependency injection

    Returns:
        GameSession: Complete game state including player stats, enemy stats, and actions
    """
    save_session_state(request, state)
    return state


@app.get("/new-words-player")
async def new_words_fetch():
    """
    Generate new Orkish battle words for the player.

    Calls the AI word generator to create fresh, funny Orkish-sounding
    words that players can use as battle commands. These words are used
    in the game's command system where players shout Ork battle cries.

    Returns:
        str: A space-separated string of 8 unique Orkish battle words

    Example:
        "WAAGH KRUMP DAKKA CHOPPA BOYZ STOMPA SHOOTA BURNA"
    """
    chad = Chat()
    return await chad.get_new_words()


@app.post("/command")
async def command(
    command: Command,
    request: Request,
    state: GameSession = Depends(get_session_state),
):
    """
    Process a battle command from the player.

    This is the main battle endpoint that processes player commands through
    the AI system. It takes the player's three action words, player type,
    and enemy type, then uses the MCP (Model Context Protocol) to:

    1. Start an MCP server session with the current game state
    2. Process the command through the AI agent ("Da Warboss Protocol")
    3. Execute appropriate battle actions via MCP tools
    4. Return the AI's response in Ork speech

    Args:
        command (Command): Battle command containing action1, action2, action3, player, and enemy
        request (Request): The HTTP request object
        state (GameSession): Current game session state from dependency injection

    Returns:
        str: AI response in Ork speech describing the battle action taken

    Example:
        Input: Command(action1="WAAGH", action2="KRUMP", action3="DAKKA",
                      player="Warboss", enemy="Human")
        Output: "WAAGH! ME KRUMPS DA HUMIE WIF BIG DAKKA! BOOM!"
    """
    save_session_state(request, state)
    chad = Chat()

    server_params = StdioServerParameters(
        command="python",
        args=["backend/mcp_server.py", state.name],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()
            response = await chad.process_query(
                session=session,
                query="1. "
                + command.action1
                + ", "
                + command.action2
                + ", "
                + command.action3
                + " 2. "
                + command.player
                + " 3. "
                + command.enemy,
            )
    return response


@app.post("/attach-session")
def attach_session(response: Response, session_name: str):
    """
    Attach a client to a specific game session.

    Creates or binds to an existing game session by setting a 'game-session'
    cookie. This cookie is used by subsequent requests to identify which
    game session the client belongs to, enabling persistent game state
    across multiple HTTP requests.

    Args:
        response (Response): The HTTP response object to set the cookie on
        session_name (str): The name/identifier for the game session

    Returns:
        None: The response cookie is set as a side effect

    Note:
        The cookie is used by the get_game_session dependency to automatically
        inject the session ID into other endpoints.
    """
    response.set_cookie(key="game-session", value=session_name)
