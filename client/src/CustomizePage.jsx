import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import CorgiSprite from "./CorgiSprite";

function CustomizePage() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [corgiType, setCorgiType] = useState("");

    function returnToLobby() {
        navigate("/lobby");
    };

    function setNewCorgi(corgiType) {
        console.log(corgiType);
        // Logic to supabase to be implemented later
    };

    function chooseCorgi(corgiType) {
        setOpen(true);
        setCorgiType(corgiType);
    };

    function ConfirmationPopup({corgiType}) {
        if (!open) return null;

        const corgiNames = {
            "tri_no_tail": "a tricolor corgi with a short tail",
            "tri": "a tricolor corgi with a long tail",
            "tan_no_tail": "a tan corgi with a short tail",
            "tan": "a tan corgi with a long tail",
        };
        const corgiName = corgiNames[corgiType];

        return (
            <div className="popup">
                <h1>Do you wish to select {corgiName} as your new corgi?</h1>
                    <button onClick={() => {setNewCorgi(corgiType); setOpen(false)}}>Yes</button>
                    <button onClick={() => {setCorgiType(""); setOpen(false)}}>No</button>
            </div>
        )
    };

    return (
        <div>
            <button onClick={returnToLobby}>Back to lobby</button>
            <h3>Customize your corgi</h3>
            <button onClick={() => chooseCorgi("tri_no_tail")}><CorgiSprite image_url={"corgi_idle/corgi_tri_no_tail_idle_1.png"}/></button>
            <button onClick={() => chooseCorgi("tri")}><CorgiSprite image_url={"corgi_idle/corgi_tri_idle_1.png"}/></button>
            <button onClick={() => chooseCorgi("tan_no_tail")}><CorgiSprite image_url={"corgi_idle/corgi_tan_no_tail_idle_1.png"}/></button>
            <button onClick={() => chooseCorgi("tan")}><CorgiSprite image_url={"corgi_idle/corgi_tan_idle_1.png"}/></button>
            <ConfirmationPopup corgiType={corgiType}/>
        </div>
    )
};

export default CustomizePage;