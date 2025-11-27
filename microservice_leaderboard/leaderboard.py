import asyncio
import websockets
import json
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from style_console_text import style_text

async def main():
    """
    Continously receives messages containing player positions in JSON format
    and sends back a leaderboard dictionary.
    """
    uri = "ws://localhost:8000/ws/leaderboard"

    async with websockets.connect(uri) as websocket:
        while True:
            msg = await websocket.recv()
            player_positions = json.loads(msg)
            print(style_text("Server:", "bold", "#FFFF9C"))
            print(style_text(json.dumps(player_positions, indent=4), "normal", "#FFFFD7"))

            sorted_players = sorted(player_positions["players"].items(), key=lambda item: item[1]["x"], reverse=True)
            for rank, (email, data) in enumerate(sorted_players, start=1):
                data["ranking"] = rank
            player_positions["players"] = dict(sorted_players)

            leaderboard = player_positions
            leaderboard["type"] = "update_leaderboard"

            await websocket.send(json.dumps(leaderboard))
            await asyncio.sleep(0.05)

asyncio.run(main())