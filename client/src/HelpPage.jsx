import {useNavigate} from 'react-router-dom';
import "./App.css";

function HelpPage() { 
    const navigate = useNavigate();

    function returnToLobby() {
        navigate("/lobby");
    };

    return (
        <div>
            <button onClick={returnToLobby}>Back to lobby</button>
            <h3>Help Page</h3>
            <ul>
                <li>Game objective: The goal of CorgiDash is simple: Be the first corgi to cross the finish line!</li>
                <li>Your corgi will automatically run forward. You only need to steer to avoid danger and collect boosts (W or up arrow to move upward, S or down arrow to move downward)</li>
                <li>Success depends on how you interact with the items scattered across the track:</li>
                <ul>
                    <li>Speed boost: Collecting a bone grants a 3-second speed burst, but you cannot collect another bone while you are currently boosted</li>
                    <li>Obstacle: Running into a distraction (still deciding on what) causes your corgi to stop and sniff around for 3 seconds</li>
                </ul>
                <li>The race begins with a clear visual countdown and ends when the last corgi crosses the finish line</li>
            </ul>
            <p>If you have any further questions, please email madelinerachow27@gmail.com!</p>
        </div>
    )
};

export default HelpPage;