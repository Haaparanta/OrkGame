import logging
import os
import tempfile
import json
import socket

import asyncio


if __package__ == "backend":
    from .storage import GameSession
else:
    from storage import GameSession

SOCKET_PATH = tempfile.gettempdir() + "/ork-game.socket"

logger = logging.getLogger("uvicorn.error")


async def ipc_server(state: dict[str, GameSession]):
    async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        try:
            data = await reader.readline()
            if not data:
                return
            message = json.loads(data)
            state[message["session_name"]].act(
                message["action"], message["player_turn"]
            )

        except Exception:
            logger.exception("Failed to read from socket")
        finally:
            writer.close()
            await writer.wait_closed()

    server = await asyncio.start_unix_server(handle_client, path=SOCKET_PATH)
    logger.info(f"✅ Async server listening on {SOCKET_PATH}")

    async with server:
        await server.serve_forever()


def send_ipc_message(session_name, action: str, player_turn: bool):
    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client.connect(SOCKET_PATH)

    message = json.dumps(
        {"session_name": session_name, "action": action, "player_turn": player_turn}
    )
    client.sendall(message.encode())

    client.close()


def delete_socket():
    os.remove(SOCKET_PATH)
