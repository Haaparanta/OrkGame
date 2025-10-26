"""
Ork Game Battle API

This module provides the main FastAPI application for the Ork Game, handling
HTTP endpoints for game session management, battle commands, and state persistence.
The API serves as the main interface between the frontend and the game logic,
utilizing MCP (Model Context Protocol) for AI-driven battle interactions.
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request, Response, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from mcp.client.stdio import stdio_client
from mcp import ClientSession, StdioServerParameters
from pydantic import BaseModel

from .storage import (
    GameSession,
    save_session_state,
    storage_middleware,
    read_state,
)
from .ipc import delete_socket, ipc_server

from .mcp_client import Command, Chat

class AttachSessionRequest(BaseModel):
    session_name: str


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

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://orkgamez.serverlul.win"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(storage_middleware)


@app.get("/current-session")
def current_session(request: Request):
    """
    Get the current game session identifier.

    Returns the session ID from the 'game-session' cookie. This endpoint
    is used to verify which session the client is currently bound to.
    If no session exists, returns None.

    Args:
        request (Request): The HTTP request object

    Returns:
        str | None: The current session identifier or None if no session exists
    """
    game_session = request.cookies.get("game-session")
    return game_session


@app.get("/session-state")
def current_session_state(
    request: Request
) -> GameSession:
    """
    Get the current game session state.

    Retrieves the complete game state for the current session, including
    player health, armor, rage, enemy status, and action history. If no
    session exists, creates a new temporary session with default values.

    Args:
        request (Request): The HTTP request object

    Returns:
        GameSession: Complete game state including player stats, enemy stats, and actions
    """
    game_session = request.cookies.get("game-session")
    
    if game_session is None:
        # Return a temporary session with default values
        return GameSession.new_session("temp_session")
    
    state = request.app.state.state.get(game_session)
    if state is None:
        state = GameSession.new_session(game_session)
    
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
        str: A space-separated string of 9 unique Orkish battle words

    Example:
        "WAAGH KRUMP DAKKA CHOPPA BOYZ STOMPA SHOOTA BURNA"
    """
    chad = Chat()
    return await chad.get_new_words()


@app.post("/command")
async def command(
    command: Command,
    request: Request,
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

    Returns:
        str: AI response in Ork speech describing the battle action taken

    Example:
        Input: Command(action1="WAAGH", action2="KRUMP", action3="DAKKA",
                      player="Warboss", enemy="Human")
        Output: "WAAGH! ME KRUMPS DA HUMIE WIF BIG DAKKA! BOOM!"
    """
    # Get or create session state
    game_session = request.cookies.get("game-session")
    
    if game_session is None:
        # Create a temporary session for this command
        game_session = "temp_session"
    
    state = request.app.state.state.get(game_session)
    if state is None:
        state = GameSession.new_session(game_session)
    
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
def attach_session(response: Response, request_data: AttachSessionRequest = Body(...)):
    """
    Attach a client to a specific game session.

    Creates or binds to an existing game session by setting a 'game-session'
    cookie. This cookie is used by subsequent requests to identify which
    game session the client belongs to, enabling persistent game state
    across multiple HTTP requests.

    Args:
        response (Response): The HTTP response object to set the cookie on
        request_data (AttachSessionRequest): The request data containing session_name

    Returns:
        dict: Success message

    Note:
        The cookie is used by the get_game_session dependency to automatically
        inject the session ID into other endpoints.
    """
    session_name = request_data.session_name
    
    if not session_name:
        raise HTTPException(status_code=400, detail="session_name is required")
    
    response.set_cookie(
        key="game-session", 
        value=session_name,
        httponly=False,  # Allow JS access for debugging
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=86400  # 24 hours
    )
    
    return {"message": "Session attached successfully", "session_name": session_name}
