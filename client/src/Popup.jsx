function Popup({open, message, buttons=[]}) {
    if (!open) return null;

    return (
        <div className="popup">
            {message && <p>{message}</p>}
            {buttons && buttons.map((button, i) => (
                <button key={i} onClick={button.onClick}>
                    {button.label}
                </button>
            ))}
        </div>
    );
}

export default Popup;