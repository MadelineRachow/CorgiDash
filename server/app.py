import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from jose import jwt, JWTError
from dotenv import load_dotenv
import json

load_dotenv()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "YOUR_SUPABASE_JWT_SECRET_HERE") 
SUPABASE_URL = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL_HERE")
SUPABASE_AUDIENCE = "authenticated" 

app = FastAPI()
player_positions = {}

def authenticate_websocket_jwt(token):
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
        self.active_connections = {}

    # Accepts incoming Websocket connection and associates it with a User ID
    async def connect(self, user_id, websocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"[User joined] Active connections: {len(self.active_connections)}")

    # Removes user from active connections dictionary when they disconnect
    def disconnect(self, user_id):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        print(f"[User disconnected] Active connections: {len(self.active_connections)}")

    # Sends message to one specific user
    async def send_personal_message(self, message, user_id):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast_message(self, message):
        for websocket in self.active_connections.values():
            await websocket.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/connect")
async def websocket_endpoint(websocket, token):
    # Fallback User ID if authentication fails
    user_id = "unauthenticated" 
    
    try:
        # Decode and verify the JWT token
        auth_payload = authenticate_websocket_jwt(token)
        user_id = auth_payload.get("sub")
        user_email = auth_payload.get("email") # Get user
        
        # Add user to the active connection dictionary
        await manager.connect(user_id, websocket)
        await manager.send_personal_message(json.dumps({"type": "connection", "message": f"Connection established. User ID: {user_id}"}), user_id)

        # Infinite loop to listen for incoming messages
        while True:
            data = await websocket.receive_text()
            # print(f"Received from client: {data}")
            try: 
                message = json.loads(data)
                if message.get("type") == "move":
                    email = message.get("email")
                    x = message.get("x", 0.0) # Temporary 0.0 bc we're not doing that yet
                    y = message.get("y")
                    if email is not None and x is not None and y is not None:
                        player_positions[email] = {"x": x, "y": y}
                    # print(f"player positions: {player_positions}")
                    state_message = json.dumps({"type": "state_update", "players": player_positions})
                    # print(f"state update: {state_message}")
                    await manager.broadcast_message(state_message)
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
        player_positions.pop(email, None)
        state_message = json.dumps({"type": "state_update", "players": player_positions})
        await manager.broadcast_message(state_message)
        print(f"User {user_id} disconnected.")
    
    # Catches any unexpected errors
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        manager.disconnect(user_id)
        
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)