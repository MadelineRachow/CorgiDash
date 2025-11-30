import asyncio
import websockets
import json
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from style_console_text import style_text

rooms_data = {}

async def main():
    uri = "ws://localhost:8000/ws/object_counter"

    async with websockets.connect(uri) as websocket:
        while True:
            msg = await websocket.recv()
            server_msg = json.loads(msg)
            print(style_text("Server:", "bold", "#9CF0FF"))
            print(style_text(json.dumps(server_msg, indent=4), "normal", "#D7F4FF"))

            if server_msg["type"] == "object_hit":
                room_id = server_msg["room_id"]
                email = server_msg["email"]
                object_type = server_msg["object_type"]

                if room_id not in rooms_data:
                    rooms_data[room_id] = {}

                if email not in rooms_data[room_id]:
                    rooms_data[room_id][email] = {"boosts_hit": 0, "obstacles_hit": 0}

                if object_type == "boost":
                    rooms_data[room_id][email]["boosts_hit"] += 1
                elif object_type == "obstacle":
                    rooms_data[room_id][email]["obstacles_hit"] += 1
                
            elif server_msg["type"] == "game_over":
                room_id = server_msg["room_id"]
                await websocket.send(json.dumps({"type": "object_counts", "room_id": room_id, "counts": rooms_data.get(room_id, {})}))

            elif server_msg["type"] == "room_deleted":
                room_id = server_msg["room_id"]
                rooms_data.pop(room_id, None)

            await asyncio.sleep(0.05)

asyncio.run(main())