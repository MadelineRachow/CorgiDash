import os
import sys
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from jose import jwt, JWTError
from dotenv import load_dotenv
import json
import time
import asyncio
import uuid
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from style_console_text import style_text

load_dotenv()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "YOUR_SUPABASE_JWT_SECRET_HERE") 
SUPABASE_URL = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL_HERE")
SUPABASE_AUDIENCE = "authenticated"
ROOM_CAPACITY = 3 
Y_SLOTS = [0.75, 0.81, 0.89]
FINISH_LINE = 2
LEADERBOARD_UPDATE_INTERVAL = 0.1

app = FastAPI()
rooms = {}
room_corgi_skins: dict[str, dict[str, str]] = {}
player_ready = {}
player_positions = {}
leaderboards = {}
room_last_leaderboard_update: dict[str, float] = {}
room_objects = {}
room_locks: dict[str, asyncio.Lock] = {}

async def update_player_position(room_id, email, x, y, username, sprite_type):
    if room_id not in rooms or len(rooms[room_id]) == 0:
        return
    
    # Update player positions and leaderboard
    player_positions.setdefault(room_id, {})[email] = {"x": x, "y": y, "email": email, "username": username, "spriteType": sprite_type}

    ws1 = getattr(app.state, "leaderboard_ws", None)
    ws2 = getattr(app.state, "generator_ws", None)
    if room_id not in player_positions:
        return
    
    current_time = time.time()
    last_update = room_last_leaderboard_update.get(room_id, 0)
    if current_time - last_update < LEADERBOARD_UPDATE_INTERVAL:
        return
    room_last_leaderboard_update[room_id] = current_time
    
    payload = {
        "type": "update_positions",
        "room_id": room_id,
        "players": player_positions[room_id]
    }

    try:
        await ws1.send_text(json.dumps(payload))
    except Exception as e:
        print(style_text(f"Error:", "bold", "#FF0000"))
        print(style_text(f"Failed to send payload to leaderboard microservice: {e}", "normal", "#FF5858"))

    try:
        await ws2.send_text(json.dumps(payload))
    except Exception as e:
        print(style_text(f"Error:", "bold", "#FF0000"))
        print(style_text(f"Failed to send payload to object generator microservice: {e}", "normal", "#FF5858"))

async def handle_object_hit(room_id, object_id, object_type, hit_by_email):
    if room_id not in room_objects:
        return
    
    lock = room_locks.setdefault(room_id, asyncio.Lock())

    async with lock:
        objects = room_objects.get(room_id, [])
        idx = next((i for i, o in enumerate(objects) if o.get("id") == object_id), None)
        if idx is None: # Already removed by someone else
            return False
        objects.pop(idx)
        room_objects[room_id] = objects

    ws3 = getattr(app.state, "counter_ws", None)
    if ws3:
        await ws3.send_text(json.dumps({"type": "object_hit", "room_id": room_id, "object_type": object_type, "email": hit_by_email}))

    await manager.broadcast_message(room_id, json.dumps({"type": "objects", "objects": room_objects[room_id]}))
    print(style_text(f"Object {object_id} removed by {hit_by_email} in {room_id}", "normal", "#A4FF9C"))
    return True
    
def authenticate_websocket_jwt(token: str) -> dict:
    try:
        # Decode and verify the JWT token
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience=SUPABASE_AUDIENCE)
        
        # Ensure token has User ID
        if not payload.get("sub"):
            raise JWTError("Invalid token: Missing user ID.")

        # Ensure token was issued by Supabase
        expected_issuer = f"{SUPABASE_URL}/auth/v1"
        if payload.get("iss") != expected_issuer:
            raise JWTError("Invalid token: Issuer mismatch.")

        # Return decoded token payload
        print(style_text(f"User authenticated: {payload['sub']}", "bold", "#FFFFFF"))
        return payload
    
    # Raise 401 Unauthorized error if token is invalid
    except JWTError as e:
        print(style_text(f"JWT Error: {e}", "bold", "#FF0000"))
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e}")

class ConnectionManager:
    def __init__(self):
        # Dictionary to keep track of active WebSocket connections
        self.active_connections: dict[str, WebSocket] = {}
        self.user_rooms: dict[str, str] = {}

    # Accepts incoming Websocket connection and associates it with a User ID
    async def connect(self, user_id: str, websocket: WebSocket):
        # Create or find a room with space
        room_id = None
        for rid, users in rooms.items():
            if len(users) < ROOM_CAPACITY:
                room_id = rid
                break
        if room_id is None:
            room_id = f"room_{len(rooms) + 1}"
            rooms[room_id] = set()
        
        # Add player to room
        rooms[room_id].add(user_id)
        self.user_rooms[user_id] = room_id

        # Accept WebSocket
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(style_text(f"[User joined] Active connections: {len(self.active_connections)} | {room_id}", "bold", "#FFFFFF"))
        return room_id

    # Removes user from active connections dictionary when they disconnect
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        print(style_text(f"[User disconnected] Active connections: {len(self.active_connections)}", "bold", "#FFFFFF"))

    # Sends message to one specific user
    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    # async def broadcast_message(self, message: str):
    #     for websocket in self.active_connections.values():
    #         await websocket.send_text(message)

    # Send message to specific room
    async def broadcast_message(self, room_id: str, message: str):
        for user_id, websocket in self.active_connections.items():
            if self.user_rooms.get(user_id) == room_id:
                await websocket.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/connect")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # Fallback User ID if authentication fails
    user_id = "unauthenticated" 
    user_email = None
    
    try:
        # Decode and verify the JWT token
        auth_payload = authenticate_websocket_jwt(token)
        user_id = auth_payload.get("sub")
        user_email = auth_payload.get("email") # Get user
        username = auth_payload.get("user_metadata", {}).get("username", user_email) # Get username
        print(f"username: {username}")
        corgi_skin = auth_payload.get("user_metadata", {}).get("corgiSkin", "") # Get corgi skin
        print(f"corgi_skin: {corgi_skin}")

        # Add user to the active connection dictionary and get room
        room_id = await manager.connect(user_id, websocket)
        room_corgi_skins.setdefault(room_id, {})[user_email] = corgi_skin
        await manager.broadcast_message(room_id, json.dumps({"type": "corgi_skins", "players": room_corgi_skins[room_id]}))
        await manager.broadcast_message(room_id, json.dumps({"type": "join/left", "message": f"{username} joined the game"}))

        # Set initial ready state
        player_ready.setdefault(room_id, {})[user_email] = {"ready": False, "username": username}
        await manager.broadcast_message(room_id, json.dumps({"type": "ready", "players": player_ready[room_id]}))

        # Set initial position state
        room_positions = player_positions.setdefault(room_id, {})
        assigned_y = None
        for y in Y_SLOTS:
            if all(player["y"] != y for player in room_positions.values()):
                assigned_y = y
                break
        # player_positions.setdefault(room_id, {})[user_email] = {"x": 0.0, "y": assigned_y, "username": username}
        await update_player_position(room_id, user_email, 0.0, assigned_y, username, sprite_type="walk")
        await manager.broadcast_message(room_id, json.dumps({"type": "state_update", "players": player_positions[room_id]}))
        if room_id in leaderboards:
            await manager.broadcast_message(room_id, json.dumps({"type": "leaderboard", "players": leaderboards[room_id]}))

        # Infinite loop to listen for incoming messages
        while True:
            data = await websocket.receive_text()
            try: 
                # if any x in player_positions >= 20, broadcast type "finished", finished True or something (leaderboard handled in a microservice so dw abt it)
                message = json.loads(data)
                
                # Update ready state dictionary
                if message.get("type") == "ready":
                    email = message.get("email")
                    ready = message.get("ready")
                    if email is not None and ready is not None:
                        player_ready.setdefault(room_id, {})[email] = {"ready": ready, "username": username}
                    await manager.broadcast_message(room_id, json.dumps({"type": "ready", "players": player_ready[room_id]}))

                if message.get("type") == "object_hit":
                    object_id = message.get("object_id")
                    object_type = message.get("object_type")
                    if object_id and user_email:
                        try:
                            await handle_object_hit(room_id, object_id, object_type, user_email)
                        except Exception as e:
                            print(style_text(f"Error handling object hit: {e}", "bold", "#FF0000"))

                # Update position state dictionary
                if message.get("type") == "move":
                    email = message.get("email")
                    x = message.get("x") 
                    y = message.get("y")
                    sprite_type = message.get("spriteType")
                    if email is not None and x is not None and y is not None:
                        await update_player_position(room_id, email, x, y, username, sprite_type)
                    await manager.broadcast_message(room_id, json.dumps({"type": "state_update", "players": player_positions[room_id]}))
                    if room_id in leaderboards:
                        await manager.broadcast_message(room_id, json.dumps({"type": "leaderboard", "players": leaderboards[room_id]}))
                    # print(style_text("Client:", "bold", "#FF9C9C"))
                    # print(style_text(json.dumps(player_positions, indent=4), "normal", "#FFD7D7"))

                    # Finish line check
                    finished_players = []
                    for player_email, position in player_positions[room_id].items():
                        if position["x"] >= FINISH_LINE:
                            finished_players.append(player_email)
                    
                    if finished_players:
                        await manager.broadcast_message(room_id, json.dumps({"type": "finished", "players": finished_players}))
                        ws3 = getattr(app.state, "counter_ws", None)
                        if ws3:
                            await ws3.send_text(json.dumps({"type": "game_over", "room_id": room_id}))

            except json.JSONDecodeError:
                print(style_text("Received invalid JSON", "bold", "#FF0000"))
    
    # If JWT fails validation, raise 1008 Policy Violation error
    except HTTPException as e:
        print(style_text(f"Connection attempt denied: {e.detail}", "bold", "#FF0000"))
        await websocket.close(code=1008, reason=e.detail) 
        return

    # Remove user from active connection dictionary upon disconnect
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        room_id = manager.user_rooms.get(user_id)

        if room_id:

            # Remove user from room and delete their position and ready states
            rooms[room_id].discard(user_id)
            if user_email in player_positions.get(room_id, {}):
                del player_positions[room_id][user_email]
            if user_email in player_ready.get(room_id, {}):
                del player_ready[room_id][user_email]
            if room_id in room_corgi_skins and user_email in room_corgi_skins[room_id]:
                del room_corgi_skins[room_id][user_email]

            # If the room is empty, delete the room
            if not rooms[room_id]:
                del rooms[room_id] 
                player_positions.pop(room_id, None)
                player_ready.pop(room_id, None)
                leaderboards.pop(room_id, None)
                room_last_leaderboard_update.pop(room_id, None)
                room_objects.pop(room_id, None)

                ws2 = getattr(app.state, "generator_ws", None)
                if ws2:
                    await ws2.send_text(json.dumps({"type": "room_deleted", "room_id": room_id}))
                ws3 = getattr(app.state, "counter_ws", None)
                if ws3:
                    await ws3.send_text(json.dumps({"type": "room_deleted", "room_id": room_id}))

        if room_id in player_positions:
            await manager.broadcast_message(room_id, json.dumps({"type": "state_update", "players": player_positions[room_id]}))
            await manager.broadcast_message(room_id, json.dumps({"type": "join/left", "message": f"{username} left the game"}))
        print(style_text(f"User {user_id} disconnected.", "normal", "#FFFFFF"))
    
    # Catches any unexpected errors
    except Exception as e:
        print(style_text(f"An unexpected error occurred: {e}", "bold", "#FF0000"))
        manager.disconnect(user_id)

@app.websocket("/ws/leaderboard") 
async def leaderboard_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(style_text("Leaderboard microservice connected!", "bold", "#FFFF9C"))
    app.state.leaderboard_ws = websocket

    try:
        while True:
            data = await websocket.receive_text()
            leaderboard = json.loads(data)
            room_id = leaderboard.get("room_id")
            leaderboards[room_id] = leaderboard["players"]
            # print(style_text("Leaderboard:", "bold", "#FFFF9C"))
            # print(style_text(json.dumps(leaderboard, indent=4), "normal", "#FFFFD7"))

    except WebSocketDisconnect:
        print(style_text("Leaderboard microservice disconnected!", "bold", "#FFFF9C"))
        app.state.leaderboard_ws = None

@app.websocket("/ws/object_generator")
async def generator_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(style_text("Object generator microservice connected!", "bold", "#A4FF9C"))
    app.state.generator_ws = websocket
    
    await websocket.send_text(json.dumps({"type": "generation_coordinates", "Y_SLOTS": Y_SLOTS, "FINISH_LINE": FINISH_LINE}))

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            room_id = msg.get("room_id")
            new_obj = msg.get("object")
            new_obj.setdefault("id", str(uuid.uuid4()))

            if room_id not in room_objects:
                room_objects[room_id] = []
            room_objects[room_id].append(new_obj)

            await manager.broadcast_message(room_id, json.dumps({"type": "objects", "objects": room_objects[room_id]}))
    
            # print(style_text("Object Generator:", "bold", "#A4FF9C"))
            # print(style_text(json.dumps(msg, indent=4), "normal", "#DAFFD7"))

    except WebSocketDisconnect:
        print(style_text("Object generator microservice disconnected!", "bold", "#A4FF9C"))
        app.state.generator_ws = None

@app.websocket("/ws/object_counter")
async def counter_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(style_text("Object counter microservice connected!", "bold", "#9CF0FF"))
    app.state.counter_ws = websocket

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            room_id = msg["room_id"]
            counts = msg.get("counts", {})

            await manager.broadcast_message(room_id, json.dumps({"type": "object_counts", "counts": counts}))

            print(style_text("Object Counter:", "bold", "#9CF0FF"))
            print(style_text(json.dumps(msg, indent=4), "normal", "#D7F4FF"))

    except WebSocketDisconnect:
        print(style_text("Object counter microservice disconnected!", "bold", "#9CF0FF"))
        app.state.counter_ws = None

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# uvicorn app:app --reload --host 0.0.0.0 --port 8000
# ngrok http 8000