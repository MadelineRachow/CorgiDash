import {useState} from 'react';

function GameOverPopup({open, returnToLobby, leaderboard, objectCounts}) {
    const [showStats, setShowStats] = useState(false);
    const toggleStats = () => setShowStats(!showStats);

    if (!open) return null;

    // Create a mapping from email to username
    const emailToUsername = Object.values(leaderboard).reduce((map, player) => {
        map[player.email] = player.username;
        return map;
    }, {});

    return (
        <div className="popup">
            <h1>Game over!</h1>
            <div>
                <p>Leaderboard</p>
                {Object.values(leaderboard)
                    .sort((a, b) => a.ranking - b.ranking)
                    .map((player, index) => (
                        <li key={player.username || index}>
                            {player.username} {player.ranking}
                        </li>
                    ))
                }
            </div>
            <button onClick={toggleStats}>
                {showStats ? "Hide stats" : "View stats"}
            </button>
            <button onClick={returnToLobby}>Back to lobby</button>
            {showStats && objectCounts && (
                <div>
                    <h2>Object Hits</h2>
                        {Object.entries(objectCounts).map(([email, counts], index) => (
                            <li key={email || index}>
                                {emailToUsername[email]}:: Boosts hit: {counts.boosts_hit || 0}, Obstacles hit: {counts.obstacles_hit || 0}
                            </li>
                        ))}
                </div>
            )}
        </div>
    );
}

export default GameOverPopup;