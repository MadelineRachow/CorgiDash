import {useState, useEffect} from "react";

const CorgiSprite = ({image_url}) => {
    const [frame, setFrame] = useState(0);
    const FRAME_COUNT = 5;
    const SPRITE_SIZE = 64;
    const FRAME_INTERVAL = 200; // ms
    const SPRITE_SCALE = 3;

    useEffect(() => {
        const interval = setInterval(() => {
        setFrame(prev => (prev + 1) % FRAME_COUNT);
        }, FRAME_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
        style={{
            width: `${SPRITE_SIZE}px`,
            height: `${SPRITE_SIZE}px`,
            backgroundImage: `url("/assets/${image_url}")`,
            backgroundPosition: `-${frame * SPRITE_SIZE}px 0px`,
            backgroundSize: `${SPRITE_SIZE * FRAME_COUNT}px ${SPRITE_SIZE}px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            transform: `scale(${SPRITE_SCALE})`,
            marginLeft: "25px",
            marginBottom: "50px"
        }}
        />
    );
};

export default CorgiSprite;