import {useEffect, useState, useRef} from 'react';
import "./App.css";

function LobbyPage({supabase}) { 
    const [userEmail, setUserEmail] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [y, setY] = useState(0.75);
    const [players, setPlayers] = useState([]);
    const ws = useRef(null);

    // const WEBSOCKET_URL = "wss://NGROK_URL/ws/connect"; // To use later to test multiplayer functionality
    const WEBSOCKET_URL = "ws://localhost:8000/ws/connect";
    const MOVE_PERCENT = 0.01;

    useEffect(() => {
        // Flag to prevent state updates after component unmount
        let isMounted = true;
        
        // Get current user session (to get auth token)
        const connectWebSocket = async() => {
            const {data: {session}} = await supabase.auth.getSession();
            if (!session) { // If no session found, update status and exit
                setConnectionStatus('No session found.');
                return;
            };

            // Extract the JWT token for authentication the WebSocket connection
            const email = session.user.email
            setUserEmail(email);
            const authToken = session.access_token;
            const socketUrl = `${WEBSOCKET_URL}?token=${authToken}`;
            ws.current = new WebSocket(socketUrl);

            // WebSocket open event handler (inform user about connection status)
            ws.current.onopen = () => {
                if (!isMounted) return;
                setConnectionStatus('Connected!');
                const message = {type: "move", email: email, y: 0.75};
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify(message))
                };
            };

            // Websocket message event handler (receives messages from server)
            ws.current.onmessage = (event) => {
                if (!isMounted) return;
                const message = JSON.parse(event.data);
                if (message.type === "state_update") {
                    setPlayers(message.players);
                };
            };

            // Websocket close event handler (provide disconnect info)
            ws.current.onclose = (event) => {
                if (!isMounted) return;
                setConnectionStatus(`Disconnected. Code: ${event.code}`);
            };

            // Websocket error event handler
            ws.current.onerror = (error) => {
                if (!isMounted) return;
                setConnectionStatus('Connection Error! Check backend status.');
            };
        };

        // Initiate Websocket connection
        connectWebSocket();

    // Cleanup function on unmount (closes WebSocket connection if still open)
        return () => {
            isMounted = false;
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.close();
            };
        };
    }, [supabase]);

    useEffect(() => {
        const handleMovement = (e) => {
            let newY = y;
            if (e.key === "ArrowUp" || e.key === "w") {newY = Math.max(0.69, y - MOVE_PERCENT)
            } else if (e.key === "ArrowDown" || e.key === "s") {newY = Math.min(0.84, y + MOVE_PERCENT)
            } else {return};

            setY(newY);
            const message = {type: "move", email: userEmail, y: newY};
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify(message))
            };
        };
        window.addEventListener("keydown", handleMovement);
        return () => window.removeEventListener("keydown", handleMovement);
    }, [userEmail, y]);

    // useEffect(() => {
    //     console.log("Updated state:", players);
    // }, [players]);

    return (
        <div className="gameBackground">
            <div className="gamePlayableArea">
                <h2>Lobby</h2>
                <p>Status: {connectionStatus}</p>
                <div>
                    {Object.entries(players).map(([email, pos]) => (
                        <div key={email} className="playerModel" style={{left: `${pos.x * 100}%`, top: `${pos.y * 100}%`}}>
                            <div>{email}</div>
                            <div className="playerSprite"/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LobbyPage;