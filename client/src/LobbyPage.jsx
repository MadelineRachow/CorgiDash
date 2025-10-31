import {useEffect, useState, useRef} from 'react';
import "./App.css";

function PlayerCanvas({players, spriteType, y, setY, ws, userEmail}) {
    const canvasRef = useRef(null);
    const frameRef = useRef(0);
    const lastFrameUpdateRef = useRef(0);
    const backgroundRef = useRef(new Image());
    const spriteRef = useRef(new Image());
    const FRAME_DURATION = 150;
    const MOVE_PERCENT_Y = 0.01;

    // Sprite dictionary (more to be added)
    const sprites = {
        walk: {src: "/assets/corgi_walk/corgi_tri_no_tail_walk_softer.png", frames: 5},
    };

    // Load the background image once on component mount
    useEffect(() => {
        backgroundRef.current.src = "/assets/game_background.jpg";
    }, []);

    // Whenever sprite type changes, update sprite image
    useEffect(() => {
        spriteRef.current.src = sprites[spriteType].src;
        frameRef.current = 0; // Reset animation to first frame
    }, [spriteType]);

    // Main canvas drawing loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const WORLD_WIDTH = 1920;
        const WORLD_HEIGHT = 1080;
        const spriteSize = 64; // Height and width of single sprite frame
        const spriteScale = 3;

        let animationId;

        function draw(timestamp) {
            canvas.width = WORLD_WIDTH;
            canvas.height = WORLD_HEIGHT;
            canvas.style.width = "85%";
            canvas.style.height = "85%";
            ctx.imageSmoothingEnabled = false;

            // Draw background
            ctx.drawImage(backgroundRef.current, 0, 0, backgroundRef.current.width / 2, backgroundRef.current.height, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

            // Handle animation frames on timed interval (FRAME_DURATION)
            if (!lastFrameUpdateRef.current) {
                lastFrameUpdateRef.current = timestamp;
            }
            const elapsed = timestamp - lastFrameUpdateRef.current;
            if (elapsed > FRAME_DURATION) {
                frameRef.current = (frameRef.current + 1) % sprites[spriteType].frames;
                lastFrameUpdateRef.current = timestamp;
            }

            // Text settings for player email
            ctx.font = "14px Arial";
            ctx.fillStyle = "black";
            ctx.textAlign = "center";

            // Loop over all players and draw them
            Object.entries(players).forEach(([email, { x, y }]) => {
                const px = x * WORLD_WIDTH;
                const py = y * WORLD_HEIGHT;

                // Draw the current animation frame of the sprite
                ctx.drawImage(
                    spriteRef.current,
                    frameRef.current * spriteSize, 0, // Source X and Y coords
                    spriteSize, spriteSize, // Source width and height
                    px - (spriteSize * spriteScale) / 2, py - (spriteSize * spriteScale) / 2, // Destination X and Y coords
                    spriteSize * spriteScale, spriteSize * spriteScale // Destination width and height
                );

                // Draw player email above sprite
                ctx.fillText(email, px, py - (spriteSize * spriteScale) / 2 - 4);
            });
            // Request the next animation frame
            animationId = requestAnimationFrame(draw);
        };
        // Start the animation loop
        animationId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationId);
    }, [players, spriteType]); // Rerun if players or sprite type changes

    // Handles player movement (currently only up/down)
    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.tabIndex = 0;
        canvas.focus()

        const handleMovement = (e) => {
            let newY = y;
            if (e.key === "ArrowUp" || e.key === "w") {newY = Math.max(0.75, y - MOVE_PERCENT_Y) // Move up
            } else if (e.key === "ArrowDown" || e.key === "s") {newY = Math.min(0.9, y + MOVE_PERCENT_Y) // Move down
            } else {return};

            // Update local state and send movement over WebSocket
            setY(newY);
            const message = {type: "move", email: userEmail, y: newY};
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify(message))
            };
        };
        // Listen for keydown events on the canvas
        canvas.addEventListener("keydown", handleMovement);
        return () => canvas.removeEventListener("keydown", handleMovement);
    }, [userEmail, y, setY]);

    // Render the canvas
    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", width: "100vw" }}>
            <canvas
                ref={canvasRef}
                style={{ display: "block", border: "5px solid black", imageRendering: "pixelated" }}
            />
        </div>
    );
}

function LobbyPage({supabase}) { 
    const [userEmail, setUserEmail] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [y, setY] = useState(0.81);
    const [players, setPlayers] = useState([]);
    const ws = useRef(null);

    // const WEBSOCKET_URL = "wss://NGROK_URL/ws/connect"; // To use later to test multiplayer functionality
    const WEBSOCKET_URL = "ws://localhost:8000/ws/connect";
    // const MOVE_PERCENT = 0.01;

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
                const message = {type: "move", email: email, y: 0.81};
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

    return (
        <div>
            {/* <h2>Lobby</h2>
            <p>Status: {connectionStatus}</p> */}
            <PlayerCanvas players={players} spriteType="walk" y={y} setY={setY} ws={ws} userEmail={userEmail}/>
        </div>
    )
};

export default LobbyPage;