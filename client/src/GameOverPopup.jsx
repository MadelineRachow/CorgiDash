function GameOverPopup({open, returnToLobby}) {
    if (!open) return null;

    return (
        <div className="popup">
            <h1>Game over!</h1>
            <p>Need to call to leaderboard microservice for winner/ranking</p>
            <button>View stats (I am useless right now)</button>
            <button onClick={returnToLobby}>Back to lobby</button>
        </div>
    );
}

export default GameOverPopup;