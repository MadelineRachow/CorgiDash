# ----- README -----
"""
Required installations:
    pip install websockets

Instructions: 
    Ensure Leaderboard_Test.py (backend) is running first, then run this file. 
    The leaderboard logic should be implemented where indicated.
"""

import asyncio
import websockets
import json

async def main():
    """
    Continously receives messages containing player positions in JSON format
    and sends back a leaderboard dictionary.
    """
    uri = "ws://localhost:8001/ws"

    async with websockets.connect(uri) as websocket:
        while True:
            msg = await websocket.recv()
            player_positions = json.loads(msg)
            print("Received from backend:", player_positions)
            # Example of expected message structure
            # {
            #     "type": "update_positions",
            #     "finishX": 1000,
            #     "players": {
            #         "player1@example.com": {"username": "Corgi1", "x": 450, "y": 200},
            #         "player2@example.com": {"username": "Corgi2", "x": 470, "y": 200},
            #         "player3@example.com": {"username": "Corgi3", "x": 430, "y": 200}
            #     }
            # }

            # ----- TODO: LEADERBOARD LOGIC HERE -----
            leaderboard = {}
            # Example of expected leaderboard format:
            # {
            #     "type": "leaderboard_update",
            #     "ranking": [
            #         {"email": "player2@example.com", "username": "Corgi2", "x": 470, "y": 200, "rank": 1},
            #         {"email": "player1@example.com", "username": "Corgi1", "x": 450, "y": 200, "rank": 2},
            #         {"email": "player3@example.com", "username": "Corgi3", "x": 430, "y": 200, "rank": 3}
            #     ]
            # }

            await websocket.send(json.dumps(leaderboard))

asyncio.run(main())