function Popup({open, readyPlayers, countdown, setReadyToStart, returnToLobby}) {
    if (!open) return null;

    return (
        <div className="popup">
            {countdown !== null ? (
                <h1>{countdown > 0 ? countdown : "Go!"}</h1>
            ) : (
                <>
                    <p>Are you ready to begin the race?</p>
                    {Object.entries(readyPlayers).map(([email, {ready, username}]) => (
                        <p key={email}>
                            {username}: {ready ? "Ready" : "Not Ready"}
                        </p>
                    ))}
                    <button onClick={() => setReadyToStart(true)}>I'm ready!</button>
                    <button onClick={returnToLobby}>Back to lobby</button>
                </>
            )}
        </div>
    );
};

export default Popup;