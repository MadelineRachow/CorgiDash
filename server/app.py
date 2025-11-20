import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from jose import jwt, JWTError
from dotenv import load_dotenv
import json

load_dotenv()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "YOUR_SUPABASE_JWT_SECRET_HERE") 
SUPABASE_URL = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL_HERE")
SUPABASE_AUDIENCE = "authenticated"
ROOM_CAPACITY = 3 
Y_SLOTS = [0.75, 0.81, 0.89]
FINISH_LINE = 250
# FINISH_LINES = {"short": 50, "medium": 250, "long": 500}

app = FastAPI()
rooms = {}
player_ready = {}
player_positions = {}

async def update_player_position(room_id, email, x, y, username):
    # Update player positions and leaderboard
    player_positions.setdefault(room_id, {})[email] = {"x": x, "y": y, "username": username}

    ws = getattr(app.state, "leaderboard_ws", None)
    if ws is None or room_id not in player_positions:
        return
    
    payload = {
        "type": "update_positions",
        "room_id": room_id,
        "players": player_positions[room_id]
    }

    try:
        await ws.send_text(json.dumps(payload))
    except Exception as e:
        print(f"Error sending to leaderboard: {e}")
    
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
        print(f"User authenticated: {payload['sub']}")
        return payload
    
    # Raise 401 Unauthorized error if token is invalid
    except JWTError as e:
        print(f"JWT Error: {e}")
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
        print(f"[User joined] Active connections: {len(self.active_connections)} | {room_id}")
        return room_id

    # Removes user from active connections dictionary when they disconnect
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        print(f"[User disconnected] Active connections: {len(self.active_connections)}")

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
        
        # Add user to the active connection dictionary and get room
        room_id = await manager.connect(user_id, websocket)
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
        player_positions.setdefault(room_id, {})[user_email] = {"x": 0.0, "y": assigned_y, "username": username}
        await manager.broadcast_message(room_id, json.dumps({"type": "state_update", "players": player_positions[room_id]}))

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

                # Update position state dictionary
                if message.get("type") == "move":
                    email = message.get("email")
                    x = message.get("x") 
                    y = message.get("y")
                    if email is not None and x is not None and y is not None:
                        await update_player_position(room_id, email, x, y, username)
                        # player_positions.setdefault(room_id, {})[email] = {"x": x, "y": y, "username": username}
                    await manager.broadcast_message(room_id, json.dumps({"type": "state_update", "players": player_positions[room_id]}))
                    print(player_positions)

                    # Finish line check
                    finished_players = []
                    for player_email, position in player_positions[room_id].items():
                        if position["x"] >= FINISH_LINE:
                            finished_players.append(player_email)
                    
                    if finished_players:
                        await manager.broadcast_message(room_id, json.dumps({"type": "finished", "players": finished_players}))

            except json.JSONDecodeError:
                print("Received invalid JSON")
    
    # If JWT fails validation, raise 1008 Policy Violation error
    except HTTPException as e:
        print(f"Connection attempt denied: {e.detail}")
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

            # If the room is empty, delete the room
            if not rooms[room_id]:
                del rooms[room_id] 
                player_positions.pop(room_id, None)
                player_ready.pop(room_id, None)

        if room_id in player_positions:
            await manager.broadcast_message(room_id, json.dumps({"type": "state_update", "players": player_positions[room_id]}))
            await manager.broadcast_message(room_id, json.dumps({"type": "join/left", "message": f"{username} left the game"}))
        print(f"User {user_id} disconnected.")
    
    # Catches any unexpected errors
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        manager.disconnect(user_id)

@app.websocket("/ws/leaderboard") 
async def leaderboard_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Leaderboard microservice connected")
    app.state.leaderboard_ws = websocket

    try:
        while True:
            data = await websocket.receive_text()
            leaderboard = json.loads(data)
            print(f"leaderboard: {leaderboard}")
    except WebSocketDisconnect:
        print("Leaderboard microservice disconnected")
        app.state.leaderboard_ws = None
        
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# uvicorn app:app --reload --host 0.0.0.0 --port 8000
# ngrok http 8000