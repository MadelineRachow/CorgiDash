function Popup({open, readyPlayers, setReadyToStart, returnToLobby}) {
    if (!open) return null;

    return (
        <div className="popup">
            <p>"Are you ready to begin the race?"</p>
            {Object.keys(readyPlayers).length > 0 && Object.entries(readyPlayers).map(([email, {ready, username}]) => (
                <p key={email}>{username}: {ready ? "Ready" : "Not Ready"}</p>
            ))}
            <button onClick={() => setReadyToStart(true)}>I'm ready!</button>
            <button onClick={returnToLobby}>Back to lobby</button>
        </div>
    );
};

export default Popup;