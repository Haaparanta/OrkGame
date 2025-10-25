from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from pydantic import BaseModel
from langgraph.prebuilt import create_react_agent
from langchain_mcp_adapters.tools import load_mcp_tools
import asyncio

from .data_format import Response, OnlyTextResponse

server_params = StdioServerParameters(
    command="python",
    args=["mcp_server.py"],
)


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
        1. A list of words the Ork Commander shouts. Example: [WAAGH, SMASH, FIXIT]
        2. Your role. Example: Warboss
        3. The enemy. Example: Human
        You must translate the Commander's crude Ork words and perform a single action from your MCP tool list"""

    async def process_query(self, session: ClientSession, query: str):
        
        # Load mcp tools and create AI agent
        tools = await load_mcp_tools(session)
        agent = create_react_agent(
            model="openai:gpt-5-mini-2025-08-07", tools=tools, prompt=self.system_prompt
        )
        res = await agent.ainvoke({"messages": query})
        return

    # Testing function to run locally
    async def chat_loop(self, session: ClientSession):
        while True:
            query = input("\nQuery: ").strip()
            # self.messages.append(query)
            await self.process_query(session, query)

    # Testing function to run locally
    async def run(self):
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # Initialize the connection
                await session.initialize()

                await self.chat_loop(session)


if __name__ == "__main__":
    chat = Chat()
    asyncio.run(chat.run())
