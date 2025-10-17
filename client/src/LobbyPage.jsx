import {useEffect, useState, useRef} from 'react';

function LobbyPage({supabase}) { 
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const ws = useRef(null);

    // const WEBSOCKET_URL = "wss://NGROK_URL/ws/connect"; // To use later to test multiplayer functionality
    const WEBSOCKET_URL = "ws://localhost:8000/ws/connect";

    const addMessage = (text) => {
        setMessages((prev) => [...prev, text]);
    };

    useEffect(() => {
        // Flag to prevent state updates after component unmount
        let isMounted = true;
        
        // Get current user session (to get auth token)
        const connectWebSocket = async() => {
            const {data: {session}} = await supabase.auth.getSession();

            // If no session found, update status and exit
            if (!session) {
                setConnectionStatus('No session found.');
                return;
            };

            // Extract the JWT token for authentication the WebSocket connection
            const authToken = session.access_token;
            const socketUrl = `${WEBSOCKET_URL}?token=${authToken}`;
            ws.current = new WebSocket(socketUrl);

            // WebSocket open event handler (inform user about connection status)
            ws.current.onopen = () => {
                if (!isMounted) return;
                setConnectionStatus('Connected!');
            };

            // Websocket message event handler (receives messages from server)
            ws.current.onmessage = (event) => {
                if (!isMounted) return;
                addMessage(event.data);
            };

            // Websocket close event handler (provide disconnect info)
            ws.current.onclose = (event) => {
                if (!isMounted) return;
                setConnectionStatus(`Disconnected. Code: ${event.code}. Reason: ${event.reason || 'Unknown reason'}`);
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

    // Send message if WebSocket is connected
    const sendMessage = () => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            const messageToSend = inputMessage;
            ws.current.send(messageToSend);
            addMessage(`Client: ${messageToSend}`); // Add message to local chat log
            setInputMessage('');
        };
    };

    return (
        <div>
            <h2>Lobby</h2>
            <p>Status: {connectionStatus}</p>
            <div>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Enter a message to echo"
                />
                <button onClick={sendMessage}>Send to server</button>
            </div>
            <div>
                {messages.map((msg, index) => (<div key={index}>{msg}</div>))}
            </div>
        </div>
    );
};

export default LobbyPage;