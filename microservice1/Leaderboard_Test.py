# ----- README -----
"""
Required installations:
    pip install websockets

Instructions: 
    Run this script first to start a test WebSocket server.
"""

import asyncio
import websockets
import json
import random

async def handler(websocket):
    """
    Continously sends simulated player positions as a JSON
    and waits for a leaderboard message in response.
    """
    while True:
        player_positions = {
            "type": "update_positions",
            "finishX": 1000,
            "players": {
                "player1@example.com": {"username": "Corgi1", "x": random.randint(400, 500), "y": 200},
                "player2@example.com": {"username": "Corgi2", "x": random.randint(400, 500), "y": 200},
                "player3@example.com": {"username": "Corgi3", "x": random.randint(400, 500), "y": 200}
            }          
        }
        await websocket.send(json.dumps(player_positions))
        print("Sent:", player_positions)

        leaderboard_msg = await websocket.recv()
        print("Received leaderboard:", leaderboard_msg)

        await asyncio.sleep(3) # Throttle for testing only

async def main():
    async with websockets.serve(handler, "localhost", 8001):
        print("Test WebSocket server running on ws://localhost:8001/ws")
        await asyncio.Future() # Keep server running indefinitely (Ctrl + C to quit)

asyncio.run(main())
       