function Popup({open, readyPlayers, countdown, readyToStart, setReadyToStart}) {
    if (!open) return null;

    return (
        <div className="background-rect">
            {countdown !== null ? (
                <h3 className="countdown">{countdown > 0 ? countdown : "Go!"}</h3>
            ) : (
                <>
                    <p className="p-game instructions"><strong>Use W or ↑ to move upward</strong></p>
                    <p className="p-game instructions"><strong>Use S or ↓ to move downward</strong></p>
                    <h3>Are you ready to begin the race?</h3>
                    <button className="big-button" onClick={() => setReadyToStart(prev => !prev)}>{readyToStart ? "I'm not ready anymore!" : "I'm ready!"}</button>
                    {Object.entries(readyPlayers).map(([email, {ready, username}]) => (
                        <p key={email} className="p-game">
                            {username}: {ready ? <strong>Ready</strong> : "Not ready"}
                        </p>
                    ))}
                </>
            )}
        </div>
    );
};

export default Popup;