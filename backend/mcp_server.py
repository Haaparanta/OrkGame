import logging
from mcp.server.fastmcp import FastMCP
from mcp.types import Resource

# Create an MCP server
mcp = FastMCP("northwind")

@mcp.tool()
def shoot_rocket():
    """Shoots your armor shredding rocket"""
    logging.info(f"FIRING ROCKET")
    return

@mcp.tool()
def rage_up():
    """Shouts a powerful battlecry that gives you a damage amplifier and might fear enemies"""
    logging.info(f"Shouting Waag (rage_up)")
    return

@mcp.tool()
def patch_up():
    """Heals your battlewounds"""
    logging.info(f"Healing now (patch_up)")
    return

@mcp.tool()
def charge():
    """Charges in to hit the enemy with your axe"""
    logging.info(f"Hitting enemy with axe now (charge)")
    return

@mcp.tool()
def throw_granade():
    """Throws your highly explosive granade"""
    logging.info(f"Throwing granade")
    return

@mcp.tool()
def fire_flamethrower():
    """Burn enemies with your flamethrower"""
    logging.info(f"Flamethrowing now")
    return

if __name__ == "__main__":
    print("Starting server...")
    # Initialize and run the server
    mcp.run(transport="stdio")