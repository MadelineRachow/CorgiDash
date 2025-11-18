import {useEffect, useState, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import GameCanvas from "./GameCanvas";
import Popup from "./Popup";
import "./App.css";

function GamePage({supabase}) {
    const navigate = useNavigate();
    const ws = useRef(null);
    const WEBSOCKET_URL = "ws://localhost:8000/ws/connect"; // "wss://NGROK_URL/ws/connect"

    const [userEmail, setUserEmail] = useState('');
    const [x, setX] = useState(0.00);
    const [y, setY] = useState(0.81); // Eventually change based on order of joining
    const [players, setPlayers] = useState([]);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [systemMessages, setSystemMessages] = useState([]); // Join or left messages
    const [readyToStart, setReadyToStart] = useState(false);
    const [raceStarted, setRaceStarted] = useState(false);

    function returnToLobby() {
        navigate("/lobby");
    };

    useEffect(() => {
        // Flag to prevent state updates after component unmount
        let isMounted = true;
        
        // Get current user session (to get auth token)
        const connectWebSocket = async() => {
            const {data: {session}} = await supabase.auth.getSession();
            if (!session) { // If no session found, update status and exit
                console.log("No session found.");
                return;
            };

            // Extract the JWT token for authentication the WebSocket connection
            const email = session.user.email;
            setUserEmail(email);
            const authToken = session.access_token;
            const socketUrl = `${WEBSOCKET_URL}?token=${authToken}`;
            ws.current = new WebSocket(socketUrl);

            // WebSocket open event handler
            ws.current.onopen = () => {
                if (!isMounted) return;
                console.log("Connected!");
                const message = {type: "move", email: email, x: 0.00, y: 0.81};
                const message2 = {type: "ready", email: email, ready: false}
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify(message));
                    ws.current.send(JSON.stringify(message2));
                };
            };

            // Websocket message event handler 
            ws.current.onmessage = (event) => {
                if (!isMounted) return;
                const message = JSON.parse(event.data);
                if (message.type === "ready") {
                    setReadyPlayers(message.players);
                };
                if (message.type === "state_update") {
                    setPlayers(message.players);
                };
                if (message.type === "join/left") {
                    const id = Date.now();
                    setSystemMessages(prev => [...prev, {id, text: message.message}]);
                    setTimeout(() => {
                        setSystemMessages(prev => prev.filter(msg => msg.id !== id));
                    }, 5000);
                }
            };

            // Websocket close event handler
            ws.current.onclose = (event) => {
                if (!isMounted) return;
                console.log(`Disconnected. Code ${event.code}`);
            };

            // Websocket error event handler
            ws.current.onerror = (error) => {
                if (!isMounted) return;
                console.log(`Connection error! Check backend status. Error: ${error}`)
            };
        };

        // Initiate Websocket connection
        connectWebSocket();

    // Cleanup function on unmount
        return () => {
            isMounted = false;
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.close();
            };
        };
    }, [supabase]);

    // Let backend know player is ready to begin race
    useEffect(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({type: "ready", email: userEmail, ready: readyToStart}));
        };
    }, [userEmail, readyToStart])

    // Start race if all players are ready
    useEffect(() => {
        if (Object.keys(readyPlayers).length > 0 && Object.values(readyPlayers).every(player => player.ready === true)) {
            if (raceStarted !== true) {
                setRaceStarted(true);
            }
        };
    // eslint-disable-next-line
    }, [readyPlayers])

    return (
        <div>
            <button onClick={returnToLobby}>Back to lobby</button>
            <p>Use W or ↑ to move upward</p>
            <p>Use S or ↓ to move downward</p>
            <div className="system-messages">
                {systemMessages.map(msg => (<div key={msg.id} className="system-message">{msg.text}</div>))}
            </div>
            <Popup 
                open={true}
                readyPlayers={readyPlayers}
                setReadyToStart={setReadyToStart}
                returnToLobby={returnToLobby}
            />
            <GameCanvas 
                ws={ws} 
                userEmail={userEmail}
                userX={x} 
                userY={y} 
                setX={setX} 
                setY={setY} 
                players={players}
                raceStarted={raceStarted}
            />
        </div>
    );    
};

export default GamePage;