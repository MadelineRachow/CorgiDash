import {useEffect, useRef, useMemo} from 'react';

function GameCanvas({ws, userEmail, userX, userY, setX, setY, players, raceStarted}) {
    const canvasRef = useRef(null);
    const backgroundRef = useRef(new Image());
    const spriteRef = useRef(new Image());
    const frameRef = useRef(0);
    const lastFrameUpdateRef = useRef(0);
    const xRef = useRef(userX);
    const yRef = useRef(userY);

    const ANCHOR_X = 0.25;
    const FRAME_DURATION = 150;
    const MOVE_PERCENT_X = 0.04;
    const MOVE_PERCENT_Y = 0.01;
    const SPRITE_TYPE = "walk";

    // Sprite dictionary (more TBA)
    const sprites = useMemo(() => ({
        walk: {src: "/assets/corgi_walk/corgi_tri_no_tail_walk_softer.png", frames: 5},
    }), []);

    // Load the background image once on component mount
    useEffect(() => {
        backgroundRef.current.src = "/assets/game_background.jpg";
    }, []);
    
    // Whenever sprite type changes, update sprite image
    useEffect(() => {
        spriteRef.current.src = sprites[SPRITE_TYPE].src;
        frameRef.current = 0; // Reset animation to first frame
    }, [SPRITE_TYPE, sprites]);    

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        
        const WORLD_WIDTH = 1920;
        const WORLD_HEIGHT = 1080;
        const SPRITE_SIZE = 64; // Height and width of single sprite frame
        const SPRITE_SCALE = 3;

        let animationID;

        function draw(timestamp) {
            canvas.width = WORLD_WIDTH;
            canvas.height = WORLD_HEIGHT;
            canvas.style.width = "85%";
            canvas.style.height = "85%";
            context.imageSmoothingEnabled = false;
            
            // Draw background
            const background = backgroundRef.current;
            const xOffset = raceStarted
                ? (userX * MOVE_PERCENT_X * background.width) % background.width
                : 0;
            const scale = WORLD_HEIGHT / background.height;

            const drawSegment = (sx, sw, dx) => // source x, source width, destination x
                context.drawImage(background, sx, 0, sw, background.height, dx * scale, 0, sw * scale, WORLD_HEIGHT);

            drawSegment(xOffset, background.width - xOffset, 0);
            drawSegment(0, xOffset, background.width - xOffset);

            // Handle animation frames on timed interval (FRAME_DURATION)
            if (!lastFrameUpdateRef.current) {
                lastFrameUpdateRef.current = timestamp;
            };

            const elapsed = timestamp - lastFrameUpdateRef.current;
            if (elapsed > FRAME_DURATION) {
                frameRef.current = (frameRef.current + 1) % sprites[SPRITE_TYPE].frames;
                lastFrameUpdateRef.current = timestamp;
            };

            // Text settings for player email
            context.font = "20px Arial";
            context.fillStyle = "black";
            context.textAlign = "center";

            // Loop over all players and draw them (TODO: interpolation?)
            Object.entries(players).forEach(([email, {x, y, username}]) => {
                let px;
                if (email === userEmail) {px = ANCHOR_X * WORLD_WIDTH} 
                else {px = (x - userX + ANCHOR_X * WORLD_WIDTH)}; // Will want to store userX locally (VERY IMPORTANT)
                const py = y * WORLD_HEIGHT;

                // Draw the current animation frame of the sprite
                context.drawImage(
                    spriteRef.current,
                    frameRef.current * SPRITE_SIZE, 0, // Source X and Y coords
                    SPRITE_SIZE, SPRITE_SIZE, // Source width and height
                    px - (SPRITE_SIZE * SPRITE_SCALE) / 2, py - (SPRITE_SIZE * SPRITE_SCALE) / 2, // Destination X and Y coords
                    SPRITE_SIZE * SPRITE_SCALE, SPRITE_SIZE * SPRITE_SCALE // Destination width and height
                );

                // Draw player username/email above sprite
                context.fillText(username, px, py - (SPRITE_SIZE * SPRITE_SCALE) / 2 - 4);
            });
            // Request the next animation frame
            animationID = requestAnimationFrame(draw);
        }
        // Start the animation loop
        animationID = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationID);
    }, [players, userX, userEmail, SPRITE_TYPE, sprites, raceStarted]);

    useEffect(() => {xRef.current = userX;}, [userX]);
    useEffect(() => {yRef.current = userY;}, [userY]);

    // Handles player movement
    useEffect(() => {
        const THROTTLE_MS = 50;
        let lastSent = 0;

        const sendMove = () => {
            const now = Date.now();
            if (now - lastSent > THROTTLE_MS && ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({type: "move", email: userEmail, x: xRef.current, y: yRef.current}));
                lastSent = now;
            };
        };

        // Horizontal movement
        const interval = setInterval(() => {
            if (!raceStarted) return;
            setX(prevX => prevX + MOVE_PERCENT_X);
            sendMove();
        }, 16);

        // Vertical movement
        const handleMovement = (e) => {
            if (!raceStarted) return;

            setY(prevY => {
                let newY = prevY;
                if (e.key === "ArrowUp" || e.key === "w") newY = Math.max(0.75, prevY - MOVE_PERCENT_Y);
                if (e.key === "ArrowDown" || e.key === "s") newY = Math.min(0.89, prevY + MOVE_PERCENT_Y);
                return newY;
            });
            sendMove();
        };      

        const canvas = canvasRef.current;
        canvas.tabIndex = 0;
        canvas.focus();
        window.addEventListener("keydown", handleMovement);

        return () => {
            clearInterval(interval);
            window.removeEventListener("keydown", handleMovement);
        };
    // eslint-disable-next-line
    }, [userEmail, ws, raceStarted]);   

    // Render the canvas
    return (
        <div style={{height: "80vh", width: "70vw"}}>
            <canvas
                ref={canvasRef}
                style={{display: "block", border: "5px solid black", imageRendering: "pixelated"}}
            />
        </div>
    );    
};

export default GameCanvas;