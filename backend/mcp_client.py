import logging
from mcp import ClientSession
from pydantic import BaseModel
from langgraph.prebuilt import create_react_agent
from langchain_mcp_adapters.tools import load_mcp_tools
import asyncio

logger = logging.getLogger("uvicorn.error")


class Command(BaseModel):
    action1: str
    action2: str
    action3: str
    player: str
    enemy: str


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

    async def process_query(self, session: ClientSession, query: str):
        # Load mcp tools and create AI agent
        logger.info("mcp_tools")
        tools = await load_mcp_tools(session)
        logger.info("agent")
        agent = create_react_agent(
            model="openai:gpt-5-mini-2025-08-07", tools=tools, prompt=self.system_prompt
        )
        logger.info("invoke")
        res = await agent.ainvoke({"messages": query})
        logger.info("done")
        for key in res.keys():
            for msg in res[key]:
                if msg.type == "ai" and msg.content != "":
                    print("AI response\n", msg.content)
                    return msg.content
        return None

    async def get_new_words(self):
        agent = create_react_agent(
            model="openai:gpt-5-mini-2025-08-07",
            tools=[],
            prompt="You are a helpful Warhammer 40k Ork linguist.",
        )
        res = await agent.ainvoke({"messages": self.word_generator_prompt})
        for key in res.keys():
            for msg in res[key]:
                if msg.type == "ai" and msg.content != "":
                    sub_result = msg.content.split(" ")
                    sub_result.append("NO")
                    return sub_result
        return None

    # Testing function to run locally
    async def chat_loop(self, session: ClientSession):
        while True:
            query = input("\nQuery: ").strip()
            # self.messages.append(query)
            await self.process_query(session, query)


if __name__ == "__main__":
    chat = Chat()
    asyncio.run(chat.run())
