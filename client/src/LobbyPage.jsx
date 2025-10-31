import { useNavigate } from 'react-router-dom';
import "./App.css";

function LobbyPage() { 
    const navigate = useNavigate();
     
    function joinGameButton() {
        navigate("/game");
    }
    
    return (
        <div>
            <p>This is the lobby page</p>
            <button onClick={joinGameButton}>Join Game</button>
        </div>
    )
};

export default LobbyPage;