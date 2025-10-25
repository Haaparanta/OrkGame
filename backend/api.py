from fastapi import Cookie, Depends, FastAPI, HTTPException, Response, status


app = FastAPI()


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


@app.get("/")
def hello(session_id: str = Depends(get_game_session)):
    return session_id
