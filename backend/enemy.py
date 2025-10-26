from pydantic import BaseModel
from .mcp_client import Chat


class Enemy(BaseModel):
    def __init__(self, role: str) -> None:
        self.role = role

    async def next_action(self, chat: Chat) -> tuple[str, str, str]:
        words = await chat.get_new_words()
        assert words is not None
        return words
