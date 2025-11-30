import asyncio
import websockets
import json
import os
import sys
import random
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from style_console_text import style_text

Y_SLOTS = []
FINISH_LINE = 0
MIN_SPACING = 0.01
MAX_SPACING = 0.05
PLAYER_BUFFER = 0.01
LOOKAHEAD = 2

async def main():
    global Y_SLOTS
    global FINISH_LINE
    uri = "ws://localhost:8000/ws/object_generator"
    objects_per_room = {}

    async with websockets.connect(uri) as websocket:
        while True:
            msg = await websocket.recv()
            server_msg = json.loads(msg)
            print(style_text("Server:", "bold", "#A4FF9C"))
            print(style_text(json.dumps(server_msg, indent=4), "normal", "#DAFFD7"))

            if server_msg["type"] == "generation_coordinates":
                Y_SLOTS = server_msg["Y_SLOTS"]
                FINISH_LINE = server_msg["FINISH_LINE"]
            elif server_msg["type"] == "room_deleted":
                room_id = server_msg["room_id"]
                if room_id in objects_per_room:
                    del objects_per_room[room_id]
            elif server_msg["type"] == "update_positions":
                player_positions = server_msg["players"]
                room_id = server_msg["room_id"]
                room_objects = objects_per_room.setdefault(room_id, [])

                # Flatten player positions and determine trailing/leading player
                players = [(pdata["x"], email) for email, pdata in player_positions.items()]
                trailing_player = min(players, key=lambda p: p[0])
                leading_player = max(players, key=lambda p: p[0])

                max_generated_x = room_objects[-1]["x"] if room_objects else 0
                target_x = leading_player[0] + LOOKAHEAD

                # Pre-generate objects up to LOOKAHEAD
                next_x = max_generated_x + random.uniform(MIN_SPACING, MAX_SPACING)
                while next_x < target_x and next_x < FINISH_LINE:
                    y = random.choice(Y_SLOTS)
                    # Avoid spawning on top of players
                    if all(abs(next_x - px) > PLAYER_BUFFER for px, _ in players):
                        # Bias type
                        obj_type = random.choices(
                            ["boost", "obstacle"],
                            weights=[0.3, 0.7] if next_x < trailing_player[0] + 10 else [0.3, 0.7]
                        )[0]
                        new_obj = {"type": obj_type, "x": next_x, "y": y}
                        room_objects.append(new_obj)
                        await websocket.send(json.dumps({"type": "spawn_object", "room_id": room_id, "object": new_obj}))
                    next_x += random.uniform(MIN_SPACING, MAX_SPACING)

                # Reactive boost for trailing player (spawn occasionally)
                if random.random() < 0.3:  # 30% chance per tick
                    reactive_x = trailing_player[0] + random.uniform(5, 10)
                    if all(abs(reactive_x - obj["x"]) > MIN_SPACING for obj in room_objects):
                        y = random.choice(Y_SLOTS)
                        reactive_obj = {"type": "boost", "x": reactive_x, "y": y}
                        room_objects.append(reactive_obj)
                        await websocket.send(json.dumps({"type": "spawn_object", "room_id": room_id, "object": reactive_obj}))

            await asyncio.sleep(0.05)

asyncio.run(main())    