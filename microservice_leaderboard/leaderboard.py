import asyncio
import websockets
import json

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
            # print("Received from backend:", player_positions)
            print(json.dumps(player_positions, indent=4))


            # ranking_list = []

            # # Convert players dict → list for sorting
            # for email, info in player_positions["players"].items():
            #     ranking_list.append({
            #         "email": email,
            #         "username": info["username"],
            #         "x": info["x"],
            #         "y": info["y"]
            #     })

            # # Sort players by x position (descending → closer to finish)
            # ranking_list.sort(key=lambda p: p["x"], reverse=True)

            # # Assign ranks
            # for i, player in enumerate(ranking_list, start=1):
            #     player["rank"] = i

            # # Build leaderboard response
            # leaderboard = {
            #     "type": "leaderboard_update",
            #     "ranking": ranking_list
            # }
            # -----------------------------------------------------------

            leaderboard = player_positions
            await websocket.send(json.dumps(leaderboard))
            await asyncio.sleep(0.05)

asyncio.run(main())