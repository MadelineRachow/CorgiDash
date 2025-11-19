function GameOverPopup({open}) {
    if (!open) return null;

    return (
        <div className="popup">
            <h1>Game over!</h1>
            <p>Need to call to leaderboard microservice for winner/ranking</p>
        </div>
    );
}

export default GameOverPopup;