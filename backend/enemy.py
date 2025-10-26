from pydantic import BaseModel

if __package__ == "backend":
    from .mcp_client import Chat
else:
    from mcp_client import Chat


class Enemy(BaseModel):
    role: str

    async def next_action(self, chat: Chat) -> tuple[str, str, str]:
        words = await chat.get_new_words()
        assert words is not None
        return words
