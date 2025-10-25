from contextlib import contextmanager
import logging
import os
import typing
import psycopg2
from mcp.server.fastmcp import FastMCP
from mcp.types import Resource

# Create an MCP server
mcp = FastMCP("northwind")

DB_HOST = os.environ.get("DB_HOST", "dataset:5432")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_USER", "postgres")
DB_DATABASE = os.environ.get("DB_USER", "northwind")


@contextmanager
def context():
    conn = psycopg2.connect(
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_DATABASE}"
    )
    cursor = conn.cursor()
    try:
        yield cursor
    finally:
        conn.close()


@mcp.resource("config://northwind/schema")
def get_config() -> list[tuple]:
    """Static schema for northwind database"""
    with context() as cursor:
        cursor.execute(
            "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public'"
        )
        return cursor.fetchall()


@mcp.tool()
def query_data(sql: str) -> dict[str, typing.Any]:
    """Execute SQL queries safely"""
    logging.info(f"Executing SQL query: {sql}")
    conn = psycopg2.connect(
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_DATABASE}"
    )
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        return {"result": cursor.fetchall()}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()


@mcp.tool()
async def list_resources() -> typing.List[Resource]:
    """ "Provides list of tables in the database"""
    try:
        with psycopg2.connect(
            f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_DATABASE}"
        ) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                """)
                tables = cursor.fetchall()
                return [
                    Resource(
                        uri=f"postgresql://{table[0]}/data",
                        name=f"Table: {table[0]}",
                        mimeType="text/plain",
                        description=f"Data in table: {table[0]}",
                    )
                    for table in tables
                ]
    except Exception as e:
        return {"error": str(e)}


@mcp.prompt()
def example_prompt(code: str) -> str:
    return f"Please review this code:\n\n{code}"


if __name__ == "__main__":
    print("Starting server...")
    # Initialize and run the server
    mcp.run(transport="stdio")