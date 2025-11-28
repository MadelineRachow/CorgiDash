import asyncio
import websockets
import json
import os
import sys
import random
import uuid
from datetime import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from style_console_text import style_text

Y_SLOTS = []
FINISH_LINE = 0
SPAWN_AHEAD = 30
MIN_SPACING = 5
MAX_OBJECTS_PER_TICK = 2
active_objects = []

def compute_player_ranks(player_positions):
    sorted_players = sorted(player_positions["players"].items(), key=lambda item: item[1]["x"], reverse=True)
    for rank, (email, data) in enumerate(sorted_players, start=1):
        data["ranking"] = rank
    return player_positions

def is_valid_position(new_x):
    return all(abs(new_x - obj["x"]) >= MIN_SPACING for obj in active_objects)

def generate_object(player_rank, num_players, furthest_x):
    boost_chance = player_rank / num_players  
    obstacle_chance = 1 - boost_chance

    object_type = random.choices(
        ["boost", "obstacle"],
        weights=[boost_chance, obstacle_chance],
        k=1
    )[0]

    x = random.uniform(furthest_x, min(furthest_x + SPAWN_AHEAD, FINISH_LINE))

    attempt = 0
    while not is_valid_position(x) and attempt < 5:
        x = random.uniform(furthest_x, min(furthest_x + SPAWN_AHEAD, FINISH_LINE))
        attempt += 1

    y = random.choice(Y_SLOTS)

    return {
        "id": str(uuid.uuid4()),
        "type": object_type,
        "x": x,
        "y": y,
        "active": True,
        "spawned_at": datetime.now().isoformat()
    }

def prune_objects(player_positions):
    players = player_positions["players"].values() 
    min_x = min(p["x"] for p in players)
    global active_objects
    active_objects = [obj for obj in active_objects if obj["x"] >= min_x - 2]

async def main():
    global Y_SLOTS
    global FINISH_LINE
    uri = "ws://localhost:8000/ws/object_generator"

    async with websockets.connect(uri) as websocket:
        while True:
            msg = await websocket.recv()
            server_msg = json.loads(msg)
            print(style_text("Server:", "bold", "#A4FF9C"))
            print(style_text(json.dumps(server_msg, indent=4), "normal", "#DAFFD7"))

            if server_msg["type"] == "generation_coordinates":
                Y_SLOTS = server_msg["Y_SLOTS"]
                FINISH_LINE = server_msg["FINISH_LINE"]
            else:
                player_positions = compute_player_ranks(server_msg)
                prune_objects(player_positions)
                players = list(player_positions["players"].values())  
                furthest_x = max(p["x"] for p in players)
                num_players = len(players)

                spawn_chance = 0.5
                for _ in range(MAX_OBJECTS_PER_TICK):
                    if random.random() < spawn_chance:
                        player = random.choice(players) 
                        new_object = generate_object(player["ranking"], num_players, furthest_x)
                        active_objects.append(new_object)
                        await websocket.send(json.dumps(active_objects))

            await asyncio.sleep(0.05)

asyncio.run(main())    