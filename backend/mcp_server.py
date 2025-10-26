import logging
import sys
from mcp.server.fastmcp import FastMCP

from ipc import send_ipc_message
from action import ActionEnum


# Create an MCP server
mcp = FastMCP("orkgame")


@mcp.tool()
def shoot_rocket(session_id: str, player_turn: bool):
    """Shoots your armor shredding rocket"""
    logging.info("FIRING ROCKET")
    send_ipc_message(session_id, ActionEnum.shoot_rocket, player_turn)
    return


@mcp.tool()
def rage_up(session_id: str, player_turn: bool):
    """Shouts a powerful battlecry that gives you a damage amplifier and might fear enemies"""
    logging.info("Shouting Waag (rage_up)")
    send_ipc_message(session_id, ActionEnum.rage_up, player_turn)
    return


@mcp.tool()
def patch_up(session_id: str, player_turn: bool):
    """Heals your battlewounds"""
    logging.info("Healing now (patch_up)")
    send_ipc_message(session_id, ActionEnum.patch_up, player_turn)
    return


@mcp.tool()
def charge(session_id: str, player_turn: bool):
    """Charges in to hit the enemy with your axe"""
    logging.info("Hitting enemy with axe now (charge)")
    send_ipc_message(session_id, ActionEnum.charge, player_turn)
    return


@mcp.tool()
def throw_granade(session_id: str, player_turn: bool):
    """Throws your highly explosive granade"""
    logging.info("Throwing granade")
    send_ipc_message(session_id, ActionEnum.throw_granade, player_turn)
    return


@mcp.tool()
def fire_flamethrower(session_id: str, player_turn: bool):
    """Burn enemies with your flamethrower"""
    logging.info("Flamethrowing now")
    send_ipc_message(session_id, ActionEnum.fire_flamethrower, player_turn)
    return


@mcp.tool()
def armor_up(session_id: str, player_turn: bool):
    """Reinforce your armor and prepare for booms"""
    logging.info("Armor up")
    send_ipc_message(session_id, ActionEnum.armor_up, player_turn)


@mcp.tool()
def omniboost(session_id: str, player_turn: bool):
    """Your roar bellows over the battlefield, perform when all commands point to Waarghing"""
    logging.info("Omniboosting")
    send_ipc_message(session_id, ActionEnum.omniboost, player_turn)


if __name__ == "__main__":
    with open("/tmp/log", "w+") as f:
        print("Starting MCP server...", file=sys.stderr, flush=True)
        # Initialize and run the server
        mcp.run(transport="stdio")
        print("Stopping MCP server...", file=sys.stderr, flush=True)
