import {useEffect, useRef, useMemo, useState} from 'react';

// NEEDS INTERPOLATION, CORGI MOVEMENT IS NOT SMOOTH CURRENTLY
function GameCanvas({ws, userEmail, userX, userY, setX, setY, players, raceStarted, raceFinished, objects, corgiSkins, finishLine}) {
    // Constants for game mechanics
    const ANCHOR_X = 0.1;               
    const FRAME_DURATION = 150;
    const DEFAULT_MOVE_X = 0.0025;
    const BOOST_MOVE_X = 0.004;
    const OBSTACLE_MOVE_X = 0.001;
    const DEFAULT_MOVE_Y = 0.01;
    const BOOST_MOVE_Y = 0.012;
    const OBSTACLE_MOVE_Y = 0.008;
    const DEFAULT_SKIN = "tri_no_tail";

    // Refs for DOM elements and game state
    const canvasRef = useRef(null);
    const backgroundRef = useRef(new Image());
    const xRef = useRef(userX);
    const yRef = useRef(userY);
    const playerFramesRef = useRef({});        
    const playerLastFrameRef = useRef({}); 
    const moveXRef = useRef(DEFAULT_MOVE_X);
    const moveYRef = useRef(DEFAULT_MOVE_Y);
    const activeSpeedRef = useRef(null);
    const [spriteType, setSpriteType] = useState("walk");
    const boostImageRef = useRef(new Image());
    const obstacleImageRef = useRef(new Image());

    useEffect(() => {
        boostImageRef.current.src = "/assets/bone.png";
        obstacleImageRef.current.src = "/assets/poppy.png";
    }, []);

    // Generate sprite URLs for each player based on their skin
    const sprites = useMemo(() => {
        const spritesMap = {};
        Object.values(players || {}).forEach(player => {
            const skin = corgiSkins?.[player.email] || DEFAULT_SKIN;
            spritesMap[player.email] = {
                walk: {src: `/assets/corgi_walk/corgi_${skin}_walk.png`, frames: 5},
                run: {src: `/assets/corgi_run/corgi_${skin}_run.png`, frames: 8},
                sniff: {src: `/assets/corgi_sniff/corgi_${skin}_sniff_walk.png`, frames: 8},
                sit: {src: `/assets/corgi_sit/corgi_${skin}_sit.png`, frames: 9},
            };
        });
        return spritesMap;
    }, [players, corgiSkins]);

    // Preload sprite images for rendering
    const spriteImages = useMemo(() => {
        const imgs = {};
        Object.entries(sprites).forEach(([email, spriteSet]) => {
            imgs[email] = {};
            Object.entries(spriteSet).forEach(([type, {src}]) => {
                const img = new Image();
                img.src = src;
                imgs[email][type] = img;
            });
        });
        return imgs;
    }, [sprites]);

    // Load background image
    useEffect(() => {
        backgroundRef.current.src = "/assets/game_background.jpg";
    }, []);

    // Change sprite to "sit" when race finishes
    useEffect(() => {
        if (raceFinished && ws.current?.readyState === WebSocket.OPEN) {
            setSpriteType("sit");
            const x = xRef.current;
            const y = yRef.current;

            ws.current.send(JSON.stringify({type: "move", email: userEmail, x, y, spriteType: "sit"}));
        };
    }, [raceFinished, spriteType, userEmail, ws]);

    // Main drawing and animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");

        // World and sprite sizes
        const WORLD_WIDTH = 1920;
        const WORLD_HEIGHT = 1080;
        const SPRITE_SIZE = 64; 
        const SPRITE_SCALE = 3;
        const OBJECT_SIZE = 48;

        let animationID;

        // Update animation frame for a player
        function updatePlayerFrame(email, pSpriteType, timestamp) {
            if (!(email in playerFramesRef.current)) playerFramesRef.current[email] = 0;
            if (!(email in playerLastFrameRef.current)) playerLastFrameRef.current[email] = timestamp;

            const lastTs = playerLastFrameRef.current[email];
            const elapsed = timestamp - lastTs;

            if (elapsed > FRAME_DURATION) {
                const framesCount = (sprites[pSpriteType] && sprites[pSpriteType].frames) ? sprites[pSpriteType].frames : 5;

                if (pSpriteType === "sit") {
                    // Sit animation loops from frame 3 onwards
                    const cur = playerFramesRef.current[email];
                    if (cur < 2) {
                        playerFramesRef.current[email] = cur + 1;
                    } else {
                        const loopStart = 3;
                        const loopLen = Math.max(framesCount - loopStart, 1);
                        playerFramesRef.current[email] = loopStart + ((cur - loopStart + 1) % loopLen);
                    };

                } else {
                    // Other animations loop normally
                    playerFramesRef.current[email] = (playerFramesRef.current[email] + 1) % framesCount;
                };
                playerLastFrameRef.current[email] = timestamp;
            };
        };

        // Draw background, players, objects, and finish line
        function draw(timestamp) {
            canvas.width = WORLD_WIDTH;
            canvas.height = WORLD_HEIGHT;
            canvas.style.width = "85%";
            canvas.style.height = "85%";
            context.imageSmoothingEnabled = false;
            const background = backgroundRef.current;

            const minecraftFont = new FontFace(
                "Minecraft",
                "url(/assets/Minecraft.ttf)"
            );

            minecraftFont.load().then(function (loadedFont) {
                document.fonts.add(loadedFont);
            }).catch(err => console.error("Font load failed:", err));

            // Draw scrolling background
            if (background && background.complete && background.naturalWidth > 0) {
                const xOffset = Math.floor((raceStarted && !raceFinished)
                    ? (userX * background.width) % background.width
                    : 0);
                const scale = WORLD_HEIGHT / background.height;

                const drawSegment = (sx, sw, dx) =>
                    context.drawImage(background, sx, 0, sw, background.height, dx * scale, 0, sw * scale, WORLD_HEIGHT);
                drawSegment(xOffset, background.width - xOffset, 0);
                drawSegment(0, xOffset, Math.floor(background.width - xOffset));

            } else {
                // Fallback background if image not loaded
                context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
                context.fillStyle = "#cfe"; 
                context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
            };

            // Draw finish line
            const finishX = (finishLine - userX - 0.005) * (background?.width || WORLD_WIDTH) + ANCHOR_X * WORLD_WIDTH;
            const finishYStart = 0.70 * WORLD_HEIGHT;
            const finishYEnd = 1.00 * WORLD_HEIGHT;
            context.strokeStyle = "black";
            context.lineWidth = 5;
            context.beginPath();
            context.moveTo(finishX, finishYStart);
            context.lineTo(finishX, finishYEnd);
            context.stroke();

            // Draw all players
            context.font = "30px Minecraft";
            context.fillStyle = "#f9d06e";
            context.textAlign = "center";
            context.shadowColor = "#47360cff";
            context.shadowOffsetX = 3;
            context.shadowOffsetY = 3;
            context.shadowBlur = 3;

            const playersArray = Object.values(players || {});
            playersArray.sort((a, b) => a.y - b.y);

            playersArray.forEach(player => {
                const email = player.email;
                const pSpriteType = (email === userEmail) ? spriteType : (player.spriteType || "walk");
                updatePlayerFrame(email, pSpriteType, timestamp);

                const anchorX_px = ANCHOR_X * WORLD_WIDTH;
                const px = (email === userEmail)
                    ? anchorX_px
                    : ((player.x - userX) * (background?.width || WORLD_WIDTH) + anchorX_px);
                const py = (player.y || 0) * WORLD_HEIGHT;

                const img = (spriteImages[email] && spriteImages[email][pSpriteType]) || spriteImages[email]?.walk;
                if (!img || !img.complete || img.naturalWidth === 0) {
                    return;
                }

                const frameIndex = playerFramesRef.current[email] || 0;
                const sx = frameIndex * SPRITE_SIZE;
                const sy = 0;

                context.drawImage(
                    img,
                    sx, sy, SPRITE_SIZE, SPRITE_SIZE,
                    px - (SPRITE_SIZE * SPRITE_SCALE) / 2, py - (SPRITE_SIZE * SPRITE_SCALE) / 2,
                    SPRITE_SIZE * SPRITE_SCALE, SPRITE_SIZE * SPRITE_SCALE
                );
                context.fillText(player.username || player.email, px, py - (SPRITE_SIZE * SPRITE_SCALE) / 2 + 45);
            });

            // Draw objects (boosts or obstacles)
            objects.forEach(obj => {
                const objScreenX = (obj.x - userX) * (background?.width || WORLD_WIDTH) + ANCHOR_X * WORLD_WIDTH;
                const objScreenY = obj.y * WORLD_HEIGHT;
                if (objScreenX + OBJECT_SIZE/2 >= 0 && objScreenX - OBJECT_SIZE/2 <= WORLD_WIDTH) {
                    const objectImage = (obj.type === "boost") ? boostImageRef.current : obstacleImageRef.current;
                    if (objectImage.complete && objectImage.naturalWidth > 0) {
                            context.drawImage(
                                objectImage,
                                objScreenX - OBJECT_SIZE / 2,
                                objScreenY - OBJECT_SIZE / 2 + 25,
                                OBJECT_SIZE,
                                OBJECT_SIZE
                        );
                    } else {
                        context.fillStyle = obj.type === "boost" ? "green" : "red";
                        context.fillRect(
                            objScreenX - OBJECT_SIZE / 2,
                            objScreenY - OBJECT_SIZE / 2 + 25,
                            OBJECT_SIZE,
                            OBJECT_SIZE
                        );
                    };
                };
            });

            // Handle object interactions (boosts/obstacles)
            function applySpeedOverTime(targetSpeedX, targetSpeedY, duration = 2000, sType, type) {
                const startTime = performance.now();
                const startSpeedX = DEFAULT_MOVE_X;
                const startSpeedY = DEFAULT_MOVE_Y;
                setSpriteType(sType);
                activeSpeedRef.current = type;

                function updateSpeed(currentTime) {
                    const elapsed = currentTime - startTime;
                    const t = Math.min(elapsed / duration, 1);

                    let factor;
                    if (t < 0.125) factor = t / 0.125;
                    else if (t > 0.875) factor = (1 - t) / 0.125;
                    else factor = 1;

                    moveXRef.current = startSpeedX + factor * (targetSpeedX - startSpeedX);
                    moveYRef.current = startSpeedY + factor * (targetSpeedY - startSpeedY);

                    if (t < 1) requestAnimationFrame(updateSpeed);
                    else {
                        moveXRef.current = DEFAULT_MOVE_X;
                        moveYRef.current = DEFAULT_MOVE_Y;
                        setSpriteType("walk");
                        activeSpeedRef.current = null;
                    };
                };
                requestAnimationFrame(updateSpeed);
            };

            objects.forEach(obj => {
                let hit = false;
                if (obj.y === 0.75 && userY >= 0.75 && userY <= 0.80) hit = true;
                if (obj.y === 0.81 && userY >= 0.79 && userY <= 0.87) hit = true;
                if (obj.y === 0.89 && userY >= 0.86 && userY <= 0.89) hit = true;

                const objLeft = obj.x;
                const objRight = obj.x + 0.05;

                if (hit && userX >= objLeft && userX <= objRight) {
                    const canCollect =
                        (obj.type === "boost" && activeSpeedRef.current !== "boost") ||
                        (obj.type === "obstacle" && activeSpeedRef.current !== "obstacle");
                    if (!canCollect) return;

                    // Notify server about object hit
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify({
                            type: "object_hit",
                            object_id: obj.id,
                            object_type: obj.type,
                            email: userEmail
                        }));
                    };

                    if (obj.type === "boost") applySpeedOverTime(BOOST_MOVE_X, BOOST_MOVE_Y, 2000, "run", "boost");
                    else if (obj.type === "obstacle") applySpeedOverTime(OBSTACLE_MOVE_X, OBSTACLE_MOVE_Y, 2000, "sniff", "obstacle");
                };
            });
            animationID = requestAnimationFrame(draw);
        };
        animationID = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationID);
    }, [ws, players, userX, userY, userEmail, spriteType, sprites, spriteImages, raceStarted, raceFinished, objects, finishLine]);

    // Keep refs updated for latest positions
    useEffect(() => { xRef.current = userX; }, [userX]);
    useEffect(() => { yRef.current = userY; }, [userY]);

    // Handle continuous movement and keyboard input
    useEffect(() => {
        const THROTTLE_MS = 0;
        let lastSent = 0;

        const sendMove = () => {
            const now = Date.now();
            if (now - lastSent > THROTTLE_MS && ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({type: "move", email: userEmail, x: xRef.current, y: yRef.current, spriteType}));
                lastSent = now;
            };
        };

        // Auto-increment horizontal position
        const interval = setInterval(() => {
            if (!raceStarted || raceFinished) return;
            setX(prevX => prevX + moveXRef.current);
            sendMove();
        }, 16);

        // Handle vertical movement from keys
        const handleMovement = (e) => {
            if (!raceStarted || raceFinished) return;
            setY(prevY => {
                let newY = prevY;
                if (e.key === "ArrowUp" || e.key === "w") newY = Math.max(0.75, prevY - moveYRef.current);
                if (e.key === "ArrowDown" || e.key === "s") newY = Math.min(0.89, prevY + moveYRef.current);
                return newY;
            });
            sendMove();
        };

        const canvas = canvasRef.current;
        if (canvas) {
            canvas.tabIndex = 0;
            canvas.focus();
        };
        window.addEventListener("keydown", handleMovement);

        return () => {
            clearInterval(interval);
            window.removeEventListener("keydown", handleMovement);
        };
    }, [userEmail, ws, raceStarted, raceFinished, spriteType, setX, setY]);

    return (
        <div className="canvas-container">
            <canvas
                ref={canvasRef}
                className="game-canvas"
            />
        </div>
    );
};

export default GameCanvas;