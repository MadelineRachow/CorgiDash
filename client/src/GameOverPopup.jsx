import {useState} from 'react';

function GameOverPopup({open, leaderboard, objectCounts}) {
    const [showStats, setShowStats] = useState(false);
    const toggleStats = () => setShowStats(!showStats);

    if (!open) return null;

    const sortedLeaderboard = Object.values(leaderboard).sort((a, b) => a.ranking - b.ranking);
    const winner = sortedLeaderboard[0];

    // Create a mapping from email to username
    const emailToUsername = Object.values(leaderboard).reduce((map, player) => {
        map[player.email] = player.username;
        return map;
    }, {});

    return (
        // <div className={`background-rect ${showStats ? "long-page center-popup" : ""} center`}>
        <div className="background-rect long-page center-popup">
            <div class="scroll-wrapper">
                <h3>Game over! {winner.username} won!</h3>
                <div>
                    <h3 className="leaderboard"><strong>Leaderboard</strong></h3>
                    {Object.values(leaderboard)
                        .sort((a, b) => a.ranking - b.ranking)
                        .map((player, index) => (
                            <p key={player.username || index}>
                                {player.username} — #{player.ranking}
                            </p>
                        ))
                    }
                </div>
                <button onClick={toggleStats} className="big-button">
                    {showStats ? "Hide stats" : "View stats"}
                </button>
                {showStats && objectCounts && (
                    <div>
                        <h3 className="counter"><strong>Boost and Obstacle Hits</strong></h3>
                        {sortedLeaderboard.map((player, index) => {
                            const counts = objectCounts[player.email] || {};
                            return (
                                <p key={player.email || index}>
                                    {player.username} — Boosts hit: {counts.boosts_hit || 0} | Obstacles hit: {counts.obstacles_hit || 0}
                                </p>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GameOverPopup;