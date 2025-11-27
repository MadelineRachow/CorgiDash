import asyncio
import websockets
import json
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from style_console_text import style_text

Y_SLOTS = []
FINISH_LINE = 0
SPAWN_AHEAD = 30
MIN_SPACING = 5
MAX_OBJECTS_PER_TICK = 2
active_objects = []

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
                player_positions = server_msg

            # Object generation here
            objects = {}

            await websocket.send(json.dumps(objects))
            await asyncio.sleep(0.05)

asyncio.run(main())    
    