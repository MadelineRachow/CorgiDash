import {useEffect, useRef} from 'react';
import "./App.css";

function BackgroundCanvas() {
    const canvasRef = useRef(null);
    const backgroundRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");

        // World dimensions
        const WORLD_WIDTH = 1920;
        const WORLD_HEIGHT = 1080;

        // Load background image
        const background = new Image();
        background.src = "/assets/game_background.jpg"; // path in public folder
        backgroundRef.current = background;

        // Draw once when image is loaded
        background.onload = () => {
            canvas.width = WORLD_WIDTH;
            canvas.height = WORLD_HEIGHT;
            canvas.style.width = "85%";
            canvas.style.height = "85%";
            context.imageSmoothingEnabled = false;

            const scale = WORLD_HEIGHT / background.height;
            context.drawImage(background, 0, 0, background.width, background.height, 0, 0, background.width * scale, WORLD_HEIGHT);
        };

        // Fallback while image is loading
        context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        context.fillStyle = "#cfe";
        context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    }, []);

    return (
        <div className="canvas-container">
            <canvas ref={canvasRef} className="game-canvas"/>
        </div>
    );
};

export default BackgroundCanvas;