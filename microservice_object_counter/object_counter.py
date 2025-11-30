import asyncio
import websockets
import json
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from style_console_text import style_text

async def main():
    uri = "ws://localhost:8000/ws/object_counter"

    async with websockets.connect(uri) as websocket:
        while True:
            msg = await websocket.recv()
            server_msg = json.loads(msg)
            print(style_text("Server:", "bold", "#9CF0FF"))
            print(style_text(json.dumps(server_msg, indent=4), "normal", "#D7F4FF"))

            if server_msg["type"] == "object_hit":
                # Code here
                pass
            elif server_msg["type"] == "game_over":
                await websocket.send(json.dumps({"type": "object_counts"}))

            await asyncio.sleep(0.05)

asyncio.run(main())