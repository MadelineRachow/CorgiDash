import {useEffect, useState, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import CorgiSprite from "./CorgiSprite";
import './App.css';

function CustomizePage({supabase}) {
    const navigate = useNavigate();
    const ws = useRef(null);
    const WEBSOCKET_URL = "ws://localhost:8001/ws/connect";
    // const WEBSOCKET_URL = "wss://adroit-conqueringly-ella.ngrok-free.dev/ws/connect";
    const [open, setOpen] = useState(false);
    const [corgiType, setCorgiType] = useState("");
    const [currentSkin, setCurrentSkin] = useState("");

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

            const {data} = await supabase.auth.getUser();
            if (data?.user) setCurrentSkin(data.user.user_metadata?.corgiSkin || "");

            // Extract the JWT token for authentication the WebSocket connection
            const authToken = session.access_token;
            const socketUrl = `${WEBSOCKET_URL}?token=${authToken}`;
            ws.current = new WebSocket(socketUrl);

            // WebSocket open event handler
            ws.current.onopen = () => {
                if (!isMounted) return;
                console.log("Connected!");
            };

            // Websocket message event handler 
            ws.current.onmessage = (event) => {
                if (!isMounted) return;
                const message = JSON.parse(event.data);
                if (message.type === "corgi_updated") {
                    console.log(`Corgi updated to ${message.corgi_skin}`)
                    supabase.auth.refreshSession().then(() => {
                        setCurrentSkin(message.corgi_skin);
                    });
                };
            };

            // Websocket close event handler
            ws.current.onclose = (event) => {
                if (!isMounted) return;
                console.log(`Disconnected. Code ${event.code}`);
            };

            // Websocket error event handler
            ws.current.onerror = (error) => {
                if (!isMounted) return;
                console.log(`Connection error! Check microservice status. Error: ${error}`)
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

    function returnToLobby() {
        navigate("/lobby");
    };

    function setNewCorgi(corgiType) {
        console.log(corgiType);
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({type: "customize_corgi", corgi_skin: corgiType}));
        };
        setCorgiType("");
    };

    function chooseCorgi(corgiType) {
        setOpen(true);
        setCorgiType(corgiType);
    };

    function ConfirmationPopup({corgiType}) {
        if (!open) return null;

        return (
            <div className="background-rect">
                <CorgiSprite image_url={`corgi_idle/corgi_${corgiType}_idle_1.png`} className="sprite select-sprite"/>
                <h3>Is this the corgi you wish to select?</h3>
                    <div className="button-row">
                        <button className="small-button" onClick={() => {setNewCorgi(corgiType); setOpen(false)}}>Yes</button>
                        <button className="small-button" onClick={() => {setCorgiType(""); setOpen(false)}}>No</button>
                    </div>
            </div>
        )
    };

    return (
        <div>
            <button className="corner-button" onClick={returnToLobby}>Back to Lobby</button>
            <div className="background-rect">
                <h3>Customize your corgi!</h3>
                <div className="buttons customize-buttons">
                    <div className="button-row">
                        <button className={currentSkin === "tri_no_tail" ? "corgi-btn selected" : "corgi-btn"} onClick={() => chooseCorgi("tri_no_tail")}>
                            <CorgiSprite image_url={"corgi_idle/corgi_tri_no_tail_idle_1.png"} className="sprite customize-sprite"/>
                        </button>
                        <button className={currentSkin === "tri" ? "corgi-btn selected" : "corgi-btn"} onClick={() => chooseCorgi("tri")}>
                            <CorgiSprite image_url={"corgi_idle/corgi_tri_idle_1.png"} className="sprite customize-sprite"/>
                        </button>
                    </div>
                    <div className="button-row">
                        <button className={currentSkin === "tan_no_tail" ? "corgi-btn selected" : "corgi-btn"} onClick={() => chooseCorgi("tan_no_tail")}>
                            <CorgiSprite image_url={"corgi_idle/corgi_tan_no_tail_idle_1.png"} className="sprite customize-sprite"/>
                        </button>
                        <button className={currentSkin === "tan" ? "corgi-btn selected" : "corgi-btn"} onClick={() => chooseCorgi("tan")}>
                            <CorgiSprite image_url={"corgi_idle/corgi_tan_idle_1.png"} className="sprite customize-sprite"/>
                        </button>
                    </div>
                </div>
            </div>
            <ConfirmationPopup corgiType={corgiType}/>
        </div>
    )
};

export default CustomizePage;