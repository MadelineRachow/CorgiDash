import {useState} from 'react';

function GameOverPopup({open, returnToLobby, objectCounts}) {
    const [showStats, setShowStats] = useState(false);
    const toggleStats = () => setShowStats(!showStats);

    if (!open) return null;

    return (
        <div className="popup">
            <h1>Game over!</h1>
            <p>Need to call to leaderboard microservice for winner/ranking</p>
            <button onClick={toggleStats}>
                {showStats ? "Hide stats" : "View stats"}
            </button>
            <button onClick={returnToLobby}>Back to lobby</button>
            {showStats && objectCounts && (
                <div>
                    <h2>Object Hits</h2>
                        {Object.entries(objectCounts).map(([email, counts], index) => (
                            <li key={email || index}>
                                {email}: Boosts hit: {counts.boosts_hit || 0}, Obstacles hit: {counts.obstacles_hit || 0}
                            </li>
                        ))}
                </div>
            )}
        </div>
    );
}

export default GameOverPopup;