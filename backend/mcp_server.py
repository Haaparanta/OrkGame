import logging
from mcp.server.fastmcp import FastMCP
from mcp.types import Resource
import sys

from ipc import send_ipc_message

# Create an MCP server
mcp = FastMCP("northwind")

session_id = sys.arv[1]

@mcp.tool()
def shoot_rocket():
    """Shoots your armor shredding rocket"""
    logging.info(f"FIRING ROCKET")
    send_ipc_message(session_id, "fire rocket")
    return


@mcp.tool()
def rage_up():
    """Shouts a powerful battlecry that gives you a damage amplifier and might fear enemies"""
    logging.info(f"Shouting Waag (rage_up)")
    send_ipc_message(session_id, "waag")
    return


@mcp.tool()
def patch_up():
    """Heals your battlewounds"""
    logging.info(f"Healing now (patch_up)")
    send_ipc_message(session_id, "heal")
    return


@mcp.tool()
def charge():
    """Charges in to hit the enemy with your axe"""
    logging.info(f"Hitting enemy with axe now (charge)")
    send_ipc_message(session_id, "charge")
    return


@mcp.tool()
def throw_granade():
    """Throws your highly explosive granade"""
    logging.info(f"Throwing granade")
    send_ipc_message(session_id, "grenade")
    return


@mcp.tool()
def fire_flamethrower():
    """Burn enemies with your flamethrower"""
    logging.info(f"Flamethrowing now")
    send_ipc_message(session_id, "flame")
    return


if __name__ == "__main__":
    print("Starting server...")
    # Initialize and run the server
    mcp.run(transport="stdio")
