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

#Output for diagrams
class ModelOutput(BaseModel):
    message: str
    chart_type: str
    title: str
    values: dict[str, float]

#Output for text only
class TextOutput(BaseModel):
    message: str
    title: str

#Class to handle mcp and agent interaction
class Chat:
    def __init__(self):
        self.messages = []
        self.system_prompt: str = """You are a master postgre assistant. 
        Your job is to use the tools and resources at your dispoal to 
        execute queries and find general information on the database and then provide the results to the user. You must always follow the following rules
        1. If the user requests a diagram or you think it would be helpful then select a fitting diagram out of pie, bar and out put the response in the following format {"message": <Your answer>, "chart_type": <diagram type>, "values": <dict[str, float]>, "title": <a title for your answer>}
        2. Keep the answer under 30000 tokens and inform the user if the answer would be longer
        3. Always provide an answer with a title like described, provide it in the following format {"message": <Your answer>, "title": <a title for your answer>}"""

    async def process_query(self, session: ClientSession, query: str):
        self.messages.append({"type": "human", "content": query})

        #Load mcp tools and create AI agent
        tools = await load_mcp_tools(session)
        agent = create_react_agent(
            model="openai:o4-mini-2025-04-16", tools=tools, prompt=self.system_prompt
        )
        res = await agent.ainvoke({"messages": self.messages})

        outputmsg = []

        for key in res.keys():
            for msg in res[key]:
                if msg.type == "ai" and msg.content != "":
                    print("AI response\n", msg.content)
                    #Try to make a diagram, if fail then make text only output
                    try:
                        out = ModelOutput.model_validate_json(msg.content)

                        out = Response.model_validate(
                            {
                                "index": 42,
                                "title": out.title,
                                "text": out.message,
                                "chart": {
                                    "chart_type": out.chart_type,
                                    "series": out.values,
                                },
                                "prompt": query,
                            }
                        )
                        outputmsg.append(out)
                    except Exception:
                        out = TextOutput.model_validate_json(msg.content)
                        out = OnlyTextResponse.model_validate(
                            {
                                "index": 69,
                                "title": out.title,
                                "text": out.message,
                                "prompt": query,
                            }
                        )
                        outputmsg.append(out)
                # Debug prints
                # elif msg.type == "tool":
                #    print("Used tool\n", msg.name)
                elif msg.type == "human":
                    print("Human prompt\n", msg.content)
        return outputmsg

    #Testing function to run locally
    async def chat_loop(self, session: ClientSession):
        while True:
            query = input("\nQuery: ").strip()
            # self.messages.append(query)
            await self.process_query(session, query)
            
    #Testing function to run locally
    async def run(self):
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # Initialize the connection
                await session.initialize()

                await self.chat_loop(session)


if __name__ == "__main__":
    chat = Chat()
    asyncio.run(chat.run())