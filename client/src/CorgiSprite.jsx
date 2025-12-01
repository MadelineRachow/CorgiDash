import {useState, useEffect} from "react";

const CorgiSprite = ({image_url, className}) => {
    const [frame, setFrame] = useState(0);
    const FRAME_COUNT = 5;
    const FRAME_INTERVAL = 200; // ms

    useEffect(() => {
        const interval = setInterval(() => {
        setFrame(prev => (prev + 1) % FRAME_COUNT);
        }, FRAME_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className={className}
            style={{
                backgroundImage: `url("/assets/${image_url}")`,
                backgroundPosition: `-${frame * 64}px 0px` 
            }}
        />
    );
};

export default CorgiSprite;