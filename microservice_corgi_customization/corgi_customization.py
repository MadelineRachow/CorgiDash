import os
import sys
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from jose import jwt, JWTError
from dotenv import load_dotenv
import json
import requests
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from style_console_text import style_text

load_dotenv()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET") 
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_AUDIENCE = "authenticated"

app = FastAPI()

def update_user_metadata(user_id, new_metadata):
    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}", "apikey": SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json"}

    existing_res = requests.get(url, headers=headers)
    if existing_res.status_code != 200:
        raise Exception(f"Failed to fetch user: {existing_res.text}")
    existing_user = existing_res.json()
    existing_metadata = existing_user.get("user_metadata", {})
    
    merged_metadata = {**existing_metadata, **new_metadata}
    payload = {"user_metadata": merged_metadata}

    put_res = requests.put(url, headers=headers, json=payload)
    if put_res.status_code != 200:
        raise Exception(f"Failed to update metadata: {put_res.text}")

    return put_res.json()

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

    # Accepts incoming Websocket connection and associates it with a User ID
    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"[User joined] Active connections: {len(self.active_connections)}")

    # Removes user from active connections dictionary when they disconnect
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        print(f"[User disconnected] Active connections: {len(self.active_connections)}")

    # Sends message to one specific user
    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/connect")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # Fallback User ID if authentication fails
    user_id = "unauthenticated" 
    
    try:
        # Decode and verify the JWT token
        auth_payload = authenticate_websocket_jwt(token)
        user_id = auth_payload.get("sub")
        
        # Add user to the active connection dictionary
        await manager.connect(user_id, websocket)

        # Infinite loop to listen for incoming messages
        while True:
            data = await websocket.receive_text()
            try: 
                # if any x in player_positions >= 20, broadcast type "finished", finished True or something (leaderboard handled in a microservice so dw abt it)
                message = json.loads(data)
                
                # Update ready state dictionary
                if message.get("type") == "customize_corgi":
                    new_skin = message.get("corgi_skin")
                    valid_skins = {"tri_no_tail", "tri", "tan_no_tail", "tan"}

                    if new_skin not in valid_skins:
                        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid corgi skin."}))
                        continue

                    try:
                        update_user_metadata(user_id, {"corgiSkin": new_skin})
                        await websocket.send_text(json.dumps({"type": "corgi_updated", "corgi_skin": new_skin}))

                    except Exception as e:
                        await websocket.send_text(json.dumps({"type": "error", "message": f"Failed to update corgi skin: {str(e)}"}))    

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
        print(style_text(f"User {user_id} disconnected.", "normal", "#FFFFFF"))
    
    # Catches any unexpected errors
    except Exception as e:
        print(style_text(f"An unexpected error occurred: {e}", "bold", "#FF0000"))
        manager.disconnect(user_id)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

# uvicorn corgi_customization:app --reload --host 0.0.0.0 --port 8001
# ngrok http 8001