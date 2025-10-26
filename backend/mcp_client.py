import asyncio
import time
import logging
from mcp import ClientSession, stdio_client, StdioServerParameters
from pydantic import BaseModel
from langchain.agents import create_agent
from langchain_mcp_adapters.tools import load_mcp_tools

logger = logging.getLogger("uvicorn.error")


class Command(BaseModel):
    action1: str
    action2: str
    action3: str
    player: str


# Output for diagrams
class ModelOutput(BaseModel):
    message: str
    chart_type: str
    title: str
    values: dict[str, float]


# Output for text only
class TextOutput(BaseModel):
    message: str
    title: str


class ToolChat:
    def __init__(self, chat, session_id: str, player_turn: bool) -> None:
        self.chat = chat
        self.session_id = session_id
        self.player_turn = player_turn

    async def __aenter__(self):
        self.server_params = StdioServerParameters(
            command="python",
            args=[
                "-u",
                "backend/mcp_server.py",
                self.session_id,
                str(self.player_turn),
            ],
        )

        self.client = stdio_client(self.server_params)
        (self.read, self.write) = await self.client.__aenter__()
        self.session = ClientSession(self.read, self.write)
        self.session = await self.session.__aenter__()
        await self.session.initialize()
        tools = await load_mcp_tools(self.session)
        agent = create_agent(
            model="openai:gpt-4.1-mini",
            tools=tools,
            system_prompt=self.chat.system_prompt,
        )
        return agent

    async def __aexit__(self, exc_type, exc, tb):
        await self.session.__aexit__(exc_type, exc, tb)
        await self.client.__aexit__(exc_type, exc, tb)


# Class to handle mcp and agent interaction
class Chat:
    def __init__(self):
        self.messages = []
        self.system_prompt: str = """You are an Ork AI agent called 'Da Warboss Protocol'.
        Every turn, you receive:
        Messages — That are:
            1. Ork words to interpret
            2. The one doing the action
            3. The opponent

        You must translate the Commander's crude Ork words in messages and perform a single action from your MCP tool list.
        Then respond only in Ork speech (loud, crude, or silly). Use a maximum of 20 words. Do not include translations, descriptions or numbering
        """

        self.word_generator_prompt: str = """Generate exactly 8 unique, funny, orkish-sounding words that orks in Warhammer 40k might use as 
        commands for offensive or defensive maneuvers in battle. Each word should feel natural in Ork speech (loud, crude, or silly). Do not include any explanations, 
        descriptions, numbering, or punctuation—output only the 8 words separated by spaces."""

        self.voice_line_agent = create_agent(model="openai:gpt-4.1-mini")

    async def process_query(self, session_id: str, player_turn: bool, query: str):
        async with ToolChat(self, session_id, player_turn) as agent:
            res = await agent.ainvoke({"messages": query})
            logger.info("done")
            for key in res.keys():
                for msg in res[key]:
                    if msg.type == "ai" and msg.content != "":
                        print("AI response\n", msg.content)
                        return msg.content
        return None

    async def get_new_words(self):
        """
        Generate new Ork battle words using the AI model.

        Returns:
            str: Space-separated string of exactly 8 Orkish battle words plus "NO" (9 total), or None if generation fails
        """
        try:
            res = await self.voice_line_agent.ainvoke(
                {"messages": self.word_generator_prompt}
            )
            for key in res.keys():
                for msg in res[key]:
                    if msg.type == "ai" and msg.content != "":
                        # Clean up the content and split into words
                        words = msg.content.strip().split()
                        # Filter out empty strings and limit to exactly 8 words
                        words = [w for w in words if w and len(w) > 0][:8]
                        # Always add "NO" as a fallback option (9 total)
                        words.append("NO")
                        # Return as space-separated string
                        return " ".join(words)
            logger.warning("No AI response received for word generation")
            return None
        except Exception as e:
            logger.error(f"Error generating new words: {str(e)}")
            return None


async def test():
    chat = Chat()
    start = time.time()
    resp = await chat.process_query("session-1", True, "")
    end = time.time()
    print("words:", resp, "took", end - start)


if __name__ == "__main__":
    asyncio.run(test())
