import logging
from mcp import ClientSession, StdioServerParameters, stdio_client
from pydantic import BaseModel
from langgraph.prebuilt import create_react_agent
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


# Class to handle mcp and agent interaction
class Chat:
    def __init__(self):
        self.messages = []
        self.system_prompt: str = """You are an Ork AI agent called 'Da Warboss Protocol'.
        You receive 3 things each turn:
        1. A list of words the Ork Commander shouts. Example: WAAGH, SMASH, FIXIT
        2. Your role. Example: Warboss
        3. The enemy. Example: Human
        You must translate the Commander's crude Ork words and perform a single action from your MCP tool list.
        Then respond only in Ork speech (loud, crude, or silly). Use a maximum of 20 words. Do not include translations, descriptions or numbering
        """

        self.word_generator_prompt: str = """Generate exactly 8 unique, funny, orkish-sounding words that orks in Warhammer 40k might use as 
        commands for offensive or defensive maneuvers in battle. Each word should feel natural in Ork speech (loud, crude, or silly). Do not include any explanations, 
        descriptions, numbering, or punctuation—output only the 8 words separated by spaces."""

        self.server_params = StdioServerParameters(
            command="python",
            args=["backend/mcp_server.py"],
        )

    async def __aenter__(self):
        self.client = stdio_client(self.server_params)
        (read, write) = await self.client.__aenter__()
        self.session = ClientSession(read, write)
        session = await self.session.__aenter__()
        await session.initialize()
        tools = await load_mcp_tools(session)
        agent = create_react_agent(
            model="openai:gpt-5-nano-2025-08-07",
            tools=tools,
            prompt=self.system_prompt,
        )
        self.agent = agent
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.session.__aexit__(exc_type, exc, tb)
        await self.client.__aexit__(exc_type, exc, tb)

    async def process_query(self, session_id: str, player_turn: bool, query: str):
        res = await self.agent.ainvoke(
            {
                "messages": query,
                "input": {"session_id": session_id, "player_turn": player_turn},
            }
        )
        logger.info("done")
        for key in res.keys():
            for msg in res[key]:
                if msg.type == "ai" and msg.content != "":
                    print("AI response\n", msg.content)
                    return msg.content
        return None

    async def get_new_words(self):
        res = await self.agent.ainvoke({"messages": self.word_generator_prompt})
        for key in res.keys():
            for msg in res[key]:
                if msg.type == "ai" and msg.content != "":
                    sub_result = msg.content.split(" ")
                    sub_result.append("NO")
                    return sub_result
        return None
